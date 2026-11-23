import { createReactAgent } from "@langchain/langgraph/prebuilt";
// import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import llmEngine from "../lib/llm.engine.js";
import { allTools } from "../tools/index.js";
import { prompt } from "../prompts/assistant.prompt.js";
import dotenv from "dotenv";
dotenv.config();

// const checkpointer = PostgresSaver.fromEnv({
//     tableName: "assistant_checkpoints",
//     connectionString: process.env.DATABASE_URL,
// });

const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL,
)

try {
    await checkpointer.setup();
} catch (error) {
    console.error("PostgreSQL checkpointer unavailable:", error.message);
}
// await checkpointer.ensureTableExists();

const assistantAgent = createReactAgent({
    llm: llmEngine.openRouterModel,
    // llm: llmEngine.groqModel,
    tools: allTools,
    checkpointer,
    prompt: prompt,
});

export default assistantAgent;