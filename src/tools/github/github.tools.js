import { tool } from "@langchain/core/tools";
import { z } from "zod";
import githubClient from "./github.client.js";

const getRepository = tool(
    async ({ owner, repo }) => {
        const { data } = await githubClient.octokit.repos.get({ owner, repo });
        return JSON.stringify({
            name: data.name,
            description: data.description,
            language: data.language,
            stars: data.stargazers_count,
            forks: data.forks_count,
            openIssues: data.open_issues_count,
            url: data.html_url
        });
    },
    {
        name: "get_github_repository",
        description: "Get details about a GitHub repository.",
        schema: z.object({
            owner: z.string(),
            repo: z.string()
        })
    }
);

const getIssues = tool(
    async ({ owner, repo }) => {
        const { data } = await githubClient.octokit.issues.listForRepo({
            owner, repo, state: "open", per_page: 20
        });

        return JSON.stringify(data.map(issue => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.html_url
        })));
    },
    {
        name: "get_github_issues",
        description: "List open issues in a GitHub repository.",
        schema: z.object({
            owner: z.string(),
            repo: z.string()
        })
    }
);

const getPullRequests = tool(
    async ({ owner, repo }) => {
        const { data } = await githubClient.octokit.pulls.list({
            owner, repo, state: "open", per_page: 20
        });

        return JSON.stringify(data.map(pr => ({
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            url: pr.html_url
        })));
    },
    {
        name: "get_github_pull_requests",
        description: "List open pull requests in a GitHub repository.",
        schema: z.object({
            owner: z.string(),
            repo: z.string()
        })
    }
);

const getCommits = tool(
    async ({ owner, repo }) => {
        const { data } = await githubClient.octokit.repos.listCommits({
            owner, repo, per_page: 10
        });

        return JSON.stringify(data.map(commit => ({
            sha: commit.sha.slice(0, 7),
            message: commit.commit.message,
            author: commit.commit.author.name,
            url: commit.html_url
        })));
    },
    {
        name: "get_github_commits",
        description: "Get the latest commits from a GitHub repository.",
        schema: z.object({
            owner: z.string(),
            repo: z.string()
        })
    }
);

export const searchRepositories = tool(
    async ({ query }) => {
        const { data } = await githubClient.octokit.search.repos({
            q: query,
            sort: "updated",
            per_page: 10
        });

        return JSON.stringify(data.items.map(repo => ({
            name: repo.full_name,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            url: repo.html_url
        })));
    },
    {
        name: "search_github_repositories",
        description: "Search GitHub repositories by name, language, or topic.",
        schema: z.object({
            query: z.string()
        })
    }
);

export const inspectRepository = tool(
    async ({ owner, repo, path }) => {
        const { data } = await githubClient.octokit.repos.getContent({
            owner,
            repo,
            path
        });

        if (Array.isArray(data)) {
            return JSON.stringify(data.map(file => ({
                name: file.name,
                type: file.type,
                path: file.path
            })));
        }

        if (data.type === "file") {
            return Buffer.from(data.content, "base64").toString("utf-8");
        }

        return JSON.stringify({
            message: "Unsupported repository content type."
        });
    },
    {
        name: "inspect_github_repository",
        description: "List repository directory contents or read a file's source code. Use path '.' for the repository root.",
        schema: z.object({
            owner: z.string(),
            repo: z.string(),
            path: z.string().default(".")
        })
    }
);


export const githubTools = [
    getRepository,
    getIssues,
    getPullRequests,
    getCommits,
    searchRepositories,
    inspectRepository
];