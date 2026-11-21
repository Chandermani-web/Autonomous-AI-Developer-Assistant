
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import llmEngine from "../lib/llm.engine.js";
import { githubTools } from "../tools/github/github.tools.js";

const checkpointer = new MemorySaver();

const assistantAgent = createReactAgent({
    // llm: llmEngine.openRouterModel,
    llm: llmEngine.groqModel,
    tools: githubTools,
    checkpointer,
    prompt: `You are an intelligent AI Developer Assistant.

    - Answer general questions directly.
    - Use GitHub tools when GitHub operations are requested.
    - Never call tools unnecessarily.
    - Explain technical concepts with practical examples.
    - Remember conversation context.
    - Never invent GitHub API results.`
});

export default assistantAgent;
