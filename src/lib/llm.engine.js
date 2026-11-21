import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatGroq } from "@langchain/groq";
import { ChatMistralAI } from "@langchain/mistralai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { TavilySearch } from "@langchain/tavily";

import dotenv from "dotenv";
dotenv.config();

class LLMEngine {
    // Private API credentials
    #openRouterApiKey;
    #groqApiKey;
    #mistralApiKey;
    #huggingFaceApiKey;
    #tavilyApiKey;

    // Cached model instances
    #openRouterModel;
    #groqModel;
    #mistralModel;
    #huggingFaceEmbeddings;
    #tavilySearch;

    constructor() {
        this.#openRouterApiKey =
            process.env.OPENROUTER_API_KEY ||
            process.env.OPEN_ROUTER_API_KEY;

        this.#groqApiKey = process.env.GROQ_API_KEY;
        this.#mistralApiKey = process.env.MISTRAL_API_KEY;
        this.#huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
        this.#tavilyApiKey = process.env.TAVILY_API_KEY;
    }

    // Validate API keys only when a service is requested
    #requireKey(key, provider) {
        if (!key) {
            throw new Error(`${provider} API key is missing.`);
        }

        return key;
    }

    // =====================================
    // 1. OPENROUTER - MAIN CHAT MODEL
    // =====================================

    get openRouterModel() {
        if (!this.#openRouterModel) {
            this.#openRouterModel = new ChatOpenRouter({
                apiKey: this.#requireKey(
                    this.#openRouterApiKey,
                    "OpenRouter"
                ),
                model:
                    process.env.OPENROUTER_CHAT_MODEL ||
                    "openai/gpt-4o-mini",
                temperature: 0.7,
                maxRetries: 3,
            });
        }

        return this.#openRouterModel;
    }

    // Normal chat
    async chat(messages) {
        return await this.openRouterModel.invoke(messages);
    }

    // Streaming chat
    async streamChat(messages) {
        return await this.openRouterModel.stream(messages);
    }

    // =====================================
    // 2. GROQ - FAST INFERENCE
    // =====================================

    get groqModel() {
        if (!this.#groqModel) {
            this.#groqModel = new ChatGroq({
                apiKey: this.#requireKey(
                    this.#groqApiKey,
                    "Groq"
                ),
                model:
                    process.env.GROQ_MODEL ||
                    "llama-3.3-70b-versatile",
                temperature: 0.3,
                maxRetries: 3
            });
        }

        return this.#groqModel;
    }

    // Quick responses
    async quickResponse(prompt) {
        return await this.groqModel.invoke(prompt);
    }

    // =====================================
    // 3. MISTRAL - TEXT PROCESSING
    // =====================================

    get mistralModel() {
        if (!this.#mistralModel) {
            this.#mistralModel = new ChatMistralAI({
                apiKey: this.#requireKey(
                    this.#mistralApiKey,
                    "Mistral"
                ),
                model:
                    process.env.MISTRAL_MODEL ||
                    "mistral-small-latest",
                temperature: 0.3,
                maxRetries: 3
            });
        }

        return this.#mistralModel;
    }

    // Summarization and text processing
    async summarize(text) {
        return await this.mistralModel.invoke([
            [
                "system",
                "You are an expert summarization assistant. " +
                "Create concise, accurate and structured summaries."
            ],
            ["human", text]
        ]);
    }

    // =====================================
    // 4. HUGGING FACE - EMBEDDINGS / RAG
    // =====================================

    get huggingFaceEmbeddings() {
        if (!this.#huggingFaceEmbeddings) {
            this.#huggingFaceEmbeddings =
                new HuggingFaceInferenceEmbeddings({
                    apiKey: this.#requireKey(
                        this.#huggingFaceApiKey,
                        "Hugging Face"
                    ),
                    model:
                        process.env.HUGGINGFACE_EMBEDDING_MODEL ||
                        "sentence-transformers/all-MiniLM-L6-v2"
                });
        }

        return this.#huggingFaceEmbeddings;
    }

    // Generate a vector for one text
    async generateEmbedding(text) {
        return await this.huggingFaceEmbeddings.embedQuery(text);
    }

    // Generate vectors for multiple documents
    async generateEmbeddings(documents) {
        return await this.huggingFaceEmbeddings.embedDocuments(
            documents
        );
    }

    // =====================================
    // 5. TAVILY - WEB SEARCH
    // =====================================

    get tavilySearch() {
        if (!this.#tavilySearch) {
            this.#tavilySearch = new TavilySearch({
                tavilyApiKey: this.#requireKey(
                    this.#tavilyApiKey,
                    "Tavily"
                ),
                maxResults: 5,
                topic: "general"
            });
        }

        return this.#tavilySearch;
    }

    // Search the internet
    async webSearch(query) {
        return await this.tavilySearch.invoke({
            query
        });
    }

    // Tools insertion
    async getGithubModel(tools){
        return this.openRouterModel.bindTools(tools);
    }

    print = () => {
        console.log(`LLM Engine initialized on worker ${process.pid}: OpenRouter, Groq, Mistral, Hugging Face, Tavily`);
    };
}

// Export singleton instance
const llmEngine = new LLMEngine();
llmEngine.print();

export default llmEngine;