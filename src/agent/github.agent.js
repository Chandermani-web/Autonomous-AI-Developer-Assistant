import { createReactAgent } from "@langchain/langgraph/prebuilt";
// import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import llmEngine from "../lib/llm.engine.js";
import { githubTools } from "../tools/github/github.tools.js";
import dotenv from "dotenv";
dotenv.config();

// const checkpointer = PostgresSaver.fromEnv({
//     tableName: "assistant_checkpoints",
//     connectionString: process.env.DATABASE_URL,
// });

const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL,
)

await checkpointer.setup();
await checkpointer.ensureTableExists();

const assistantAgent = createReactAgent({
    llm: llmEngine.openRouterModel,
    // llm: llmEngine.groqModel,
    tools: githubTools,
    checkpointSaver: checkpointer,
    prompt: `You are an intelligent AI Developer Assistant.

    - Answer general questions directly.
    - Use GitHub tools when GitHub operations are requested.
    - Never call tools unnecessarily.
    - Explain technical concepts with practical examples.
    - Remember conversation context.
    - Never invent GitHub API results.`
});

export default assistantAgent;