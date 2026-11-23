import pool from "../config/database.js";
import gmail from "../tools/gmail/gmail.config.js";
import githubClient from "../tools/github/github.client.js";
import { sendQueue, deleteQueue } from "../config/queue.config.js";
import redisClient from "../config/caching.js";

const cache = new Map();

const getCached = async (key, ttl, loader) => {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  const value = await loader();
  cache.set(key, { expiresAt: Date.now() + ttl, value });
  return value;
};

const headerValue = (headers = [], name) =>
  headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";

export const getDashboard = async () => {
  const [gmailData, githubData, postgresData, queueData, redisData, sessionsData] =
    await Promise.all([
      getCached("gmail-dashboard", 20_000, getGmailDashboard).catch((error) =>
        ({ status: "unavailable", error: error.message, unread: 0, recent: [] })),
      getCached("github-dashboard", 60_000, getGithubDashboard).catch((error) =>
        ({ status: "unavailable", error: error.message, repositories: [], user: null })),
      getCached("postgres-dashboard", 30_000, getPostgresDashboard).catch((error) =>
        ({ status: "unavailable", error: error.message, databases: [], tables: [] })),
      getQueueDashboard().catch((error) =>
        ({ status: "unavailable", error: error.message, send: {}, delete: {} })),
      getRedisStatus().catch((error) =>
        ({ status: "unavailable", error: error.message })),
      getCached("session-dashboard", 30_000, getSessions).catch((error) =>
        ({ status: "unavailable", error: error.message, sessions: [] })),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    gmail: gmailData,
    github: githubData,
    postgres: postgresData,
    queues: queueData,
    redis: redisData,
    sessions: sessionsData,
  };
};

export const getGmailDashboard = async () => {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return { status: "not_configured", unread: 0, recent: [], labels: [] };
  }

  const [unreadResult, recentResult, labelsResult] = await Promise.all([
    gmail.users.messages.list({ userId: "me", q: "in:inbox is:unread", maxResults: 100 }),
    gmail.users.messages.list({ userId: "me", q: "in:inbox", maxResults: 8 }),
    gmail.users.labels.list({ userId: "me" }),
  ]);

  const recentIds = (recentResult.data.messages || []).slice(0, 8);
  const recent = await Promise.all(recentIds.map(async (item) => {
    const { data } = await gmail.users.messages.get({
      userId: "me",
      id: item.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date"],
    });
    const headers = data.payload?.headers || [];
    return {
      id: data.id,
      from: headerValue(headers, "From"),
      subject: headerValue(headers, "Subject") || "(No subject)",
      date: headerValue(headers, "Date"),
      snippet: data.snippet || "",
      unread: (data.labelIds || []).includes("UNREAD"),
      labels: data.labelIds || [],
    };
  }));

  return {
    status: "connected",
    unread: unreadResult.data.resultSizeEstimate || 0,
    recent,
    labels: (labelsResult.data.labels || [])
      .filter((label) => label.type === "system")
      .map((label) => ({ id: label.id, name: label.name })),
  };
};

export const getGithubDashboard = async () => {
  if (!process.env.GITHUB_TOKEN) {
    return { status: "not_configured", user: null, repositories: [] };
  }
  const userResponse = await githubClient.octokit.users.getAuthenticated();
  const reposResponse = await githubClient.octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 8,
  });
  const repositories = await Promise.all(reposResponse.data.map(async (repo) => {
    const [issues, pulls, commits] = await Promise.all([
      githubClient.octokit.issues.listForRepo({ owner: repo.owner.login, repo: repo.name, state: "open", per_page: 5 }),
      githubClient.octokit.pulls.list({ owner: repo.owner.login, repo: repo.name, state: "open", per_page: 5 }),
      githubClient.octokit.repos.listCommits({ owner: repo.owner.login, repo: repo.name, per_page: 5 }),
    ]);
    return {
      name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: issues.data.length,
      openPullRequests: pulls.data.length,
      commits: commits.data.map((commit) => ({
        sha: commit.sha.slice(0, 7),
        message: commit.commit.message,
        author: commit.commit.author?.name || "",
        date: commit.commit.author?.date || "",
        url: commit.html_url,
      })),
      url: repo.html_url,
      updatedAt: repo.updated_at,
    };
  }));
  return {
    status: "connected",
    user: {
      login: userResponse.data.login,
      name: userResponse.data.name,
      avatarUrl: userResponse.data.avatar_url,
      publicRepos: userResponse.data.public_repos,
    },
    repositories,
  };
};

export const getPostgresDashboard = async () => {
  const client = await pool.connect();
  try {
    const [databases, tables, server] = await Promise.all([
      client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"),
      client.query(`SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_schema, table_name`),
      client.query("SELECT current_database() AS database, current_user AS username, version() AS version"),
    ]);
    return {
      status: "connected",
      host: process.env.PGHOST || null,
      port: Number(process.env.PGPORT || 5432),
      database: server.rows[0]?.database,
      username: server.rows[0]?.username,
      version: server.rows[0]?.version,
      databases: databases.rows.map((row) => row.datname),
      tables: tables.rows,
    };
  } finally {
    client.release();
  }
};

export const getQueueDashboard = async () => {
  const getCounts = async (queue) => {
    const counts = await queue.getJobCounts(
      "waiting", "active", "completed", "failed", "delayed"
    );
    return counts;
  };
  const [send, deletion] = await Promise.all([
    getCounts(sendQueue),
    getCounts(deleteQueue),
  ]);
  return { status: "connected", send, delete: deletion };
};

export const getRedisStatus = async () => ({
  status: redisClient.isReady ? "connected" : "connecting",
});

export const getSessions = async () => {
  const { rows } = await pool.query(`
    SELECT thread_id,
           COUNT(*) AS checkpoint_count,
           MAX(checkpoint_id) AS latest_checkpoint
    FROM public.checkpoints
    GROUP BY thread_id
    ORDER BY MAX(checkpoint_id) DESC
    LIMIT 30
  `);
  return {
    status: "connected",
    sessions: rows.map((row) => ({
      id: row.thread_id,
      checkpointCount: Number(row.checkpoint_count),
      latestCheckpoint: row.latest_checkpoint,
    })),
  };
};
