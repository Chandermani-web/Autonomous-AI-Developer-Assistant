import dotenv from "dotenv";

dotenv.config();

export const llmConfig = Object.freeze({
    openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_CHAT_MODEL,
        temperature: 0.4,
        maxRetries: 2
    },

    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL,
        temperature: 0.3,
        maxRetries: 2
    },

    mistral: {
        apiKey: process.env.MISTRAL_API_KEY,
        model: process.env.MISTRAL_MODEL,
        temperature: 0.3,
        maxRetries: 2
    },

    huggingface: {
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: process.env.HUGGINGFACE_EMBEDDING_MODEL,
    }
});