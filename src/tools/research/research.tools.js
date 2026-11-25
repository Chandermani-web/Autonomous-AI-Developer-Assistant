import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchTopicNews } from "./news/news.service.js";
import { runDeepResearch } from "./research.service.js";
import { findRemoteJobs, getJobDetails } from "./jobs/jobs.service.js";

export const researchTools = [
    tool(
        async ({ topic, timeRange, maxResults }) =>
            JSON.stringify(await searchTopicNews(topic, { timeRange, maxResults }), null, 2),
        {
            name: "search_topic_news",
            description: "Search recent news about a topic and return article titles, dates, summaries, and source URLs.",
            schema: z.object({
                topic: z.string().min(2),
                timeRange: z.enum(["day", "week", "month", "year"]).optional(),
                maxResults: z.number().int().min(1).max(20).optional(),
            }),
        }
    ),
    tool(
        async ({ topic, maxSources, timeRange }) =>
            JSON.stringify(await runDeepResearch(topic, { maxSources, timeRange }), null, 2),
        {
            name: "deep_research",
            description: "Collect multiple web sources about a topic for a detailed, evidence-based research synthesis. Return source material and URLs; do not invent conclusions.",
            schema: z.object({
                topic: z.string().min(2),
                maxSources: z.number().int().min(3).max(20).optional(),
                timeRange: z.enum(["day", "week", "month", "year"]).optional(),
            }),
        }
    ),
    tool(
        async ({ roles, scope, maxResults }) =>
            JSON.stringify(await findRemoteJobs({ roles, scope, maxResults }), null, 2),
        {
            name: "find_remote_jobs",
            description: "Find remote MERN and full-stack jobs. Distinguish jobs explicitly open to India from worldwide remote jobs; do not assume all remote jobs accept applicants from India.",
            schema: z.object({
                roles: z.array(z.string()).optional(),
                scope: z.enum(["india", "worldwide", "both"]).default("both"),
                maxResults: z.number().int().min(1).max(50).optional(),
            }),
        }
    ),
    tool(
        async ({ url }) => JSON.stringify(await getJobDetails(url), null, 2),
        {
            name: "get_job_details",
            description: "Extract details from a public job listing URL, including any recruiter email explicitly published on the page.",
            schema: z.object({ url: z.string().url() }),
        }
    ),
];

export default researchTools;