import { researchConfig } from "./research.config.js";
import { cleanText, normalizeUrl, deduplicateBy, truncate } from "./research.utils.js";

async function requestJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), researchConfig.requestTimeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: { "content-type": "application/json", ...(options.headers || {}) },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body?.detail || body?.message || `HTTP ${response.status}`);
        }
        return body;
    } finally {
        clearTimeout(timeout);
    }
}

export async function tavilySearch(query, options = {}) {
    if (!researchConfig.tavily.apiKey) {
        throw new Error("TAVILY_API_KEY is missing from the environment.");
    }

    const result = await requestJson(`${researchConfig.tavily.baseUrl}/search`, {
        method: "POST",
        body: JSON.stringify({
            api_key: researchConfig.tavily.apiKey,
            query,
            search_depth: options.searchDepth || researchConfig.tavily.searchDepth,
            max_results: options.maxResults || researchConfig.tavily.maxResults,
            include_answer: false,
            include_raw_content: options.includeRawContent ?? true,
            include_images: false,
            topic: options.topic || "general",
            time_range: options.timeRange,
        }),
    });

    const results = (result.results || []).map((item) => ({
        title: cleanText(item.title || ""),
        url: normalizeUrl(item.url),
        content: truncate(item.content || item.raw_content || "", 5000),
        publishedDate: item.published_date || null,
        score: typeof item.score === "number" ? item.score : null,
        source: (() => {
            try { return new URL(item.url).hostname; } catch { return null; }
        })(),
    })).filter((item) => item.url);

    return {
        query,
        answer: cleanText(result.answer || ""),
        results: deduplicateBy(results, (item) => item.url),
        responseTime: result.response_time ?? null,
    };
}

export async function tavilyExtract(urls) {
    if (!researchConfig.tavily.apiKey) {
        throw new Error("TAVILY_API_KEY is missing from the environment.");
    }
    const safeUrls = [...new Set(urls.map(normalizeUrl).filter(Boolean))].slice(0, 20);
    if (!safeUrls.length) return [];

    const result = await requestJson(`${researchConfig.tavily.baseUrl}/extract`, {
        method: "POST",
        body: JSON.stringify({
            api_key: researchConfig.tavily.apiKey,
            urls: safeUrls,
            extract_depth: "advanced",
            format: "markdown",
        }),
    });

    return (result.results || []).map((item) => ({
        url: normalizeUrl(item.url),
        rawContent: truncate(item.raw_content || item.content || "", 12000),
        images: item.images || [],
    })).filter((item) => item.url);
}

export async function runDeepResearch(topic, options = {}) {
    const query = `${topic} latest developments background evidence different perspectives`;
    const search = await tavilySearch(query, {
        maxResults: options.maxSources || researchConfig.tavily.maxSources,
        searchDepth: "advanced",
        timeRange: options.timeRange,
    });
    const extracted = await tavilyExtract(search.results.slice(0, 8).map((item) => item.url));
    const extractedByUrl = new Map(extracted.map((item) => [item.url, item]));

    const sources = search.results.map((item) => ({
        ...item,
        fullContent: extractedByUrl.get(item.url)?.rawContent || item.content,
    }));

    return {
        topic,
        createdAt: new Date().toISOString(),
        summary: search.answer || null,
        findings: sources,
        sourceCount: sources.length,
        synthesisInstructions: "Use research.prompts.js with the configured summarization model to synthesize these sources.",
    };
}
