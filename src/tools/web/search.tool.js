import { tavily } from "@tavily/core";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

export const searchWeb = tool(
    async ({query, maxResults}) => {
        const response = await client.search(query, {
            maxResults,
            searchDepth: "advanced"
        });

        return JSON.stringify(response.results);
    },
    {
        name: "web_search",
        description: "Search the internet for current information, recent news, documentation, and reliable sources.",
        schema: z.object({
            query: z.string().min(2),
            maxResults: z.number().int().min(1).max(10).default(5)
        })
    }
);