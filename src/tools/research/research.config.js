const numberFromEnv = (name, fallback) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const researchConfig = {
    tavily: {
        apiKey: process.env.TAVILY_API_KEY,
        baseUrl: "https://api.tavily.com",
        searchDepth: process.env.RESEARCH_SEARCH_DEPTH || "advanced",
        maxResults: numberFromEnv("RESEARCH_MAX_RESULTS", 10),
        maxSources: numberFromEnv("RESEARCH_MAX_SOURCES", 12),
    },
    jobs: {
        maxResults: numberFromEnv("RESEARCH_MAX_JOB_RESULTS", 20),
        remoteScope: process.env.JOB_REMOTE_SCOPE || "both",
        targetCountry: process.env.JOB_TARGET_COUNTRY || "IN",
        targetRoles: (process.env.JOB_TARGET_ROLE || "MERN Developer,Full-stack Developer")
            .split(",").map((role) => role.trim()).filter(Boolean),
        experience: process.env.JOB_TARGET_EXPERIENCE || "",
    },
    output: {
        directory: process.env.RESEARCH_OUTPUT_DIR || "generated/research",
    },
    requestTimeoutMs: numberFromEnv("RESEARCH_REQUEST_TIMEOUT_MS", 30000),
};
