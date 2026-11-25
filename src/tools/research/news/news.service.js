import { tavilySearch } from "../research.service.js";
import { deduplicateBy, parseDate } from "../research.utils.js";

export async function searchTopicNews(topic, options = {}) {
    if (!topic?.trim()) throw new Error("A topic is required.");

    const result = await tavilySearch(`${topic} latest news updates`, {
        topic: "news",
        timeRange: options.timeRange || "week",
        maxResults: options.maxResults,
        searchDepth: "advanced",
    });

    const articles = deduplicateBy(result.results, (item) => item.url)
        .map((item) => ({
            ...item,
            publishedDate: parseDate(item.publishedDate),
        }))
        .sort((a, b) => {
            if (!a.publishedDate) return 1;
            if (!b.publishedDate) return -1;
            return new Date(b.publishedDate) - new Date(a.publishedDate);
        });

    return {
        topic,
        searchedAt: new Date().toISOString(),
        articleCount: articles.length,
        articles,
    };
}