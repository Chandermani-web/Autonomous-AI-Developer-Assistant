import { createReactAgent } from "@langchain/langgraph/prebuilt";
// import { MemorySaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import llmEngine from "../lib/llm.engine.js";
import { githubTools } from "../tools/github/github.tools.js";
import { gmailTools } from "../tools/gmail/gmail.tools.js";
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

await checkpointer.setup();
// await checkpointer.ensureTableExists();

const assistantAgent = createReactAgent({
    llm: llmEngine.openRouterModel,
    // llm: llmEngine.groqModel,
    tools: [...githubTools, ...gmailTools],
    checkpointer,
    prompt: prompt,
});

export default assistantAgent;