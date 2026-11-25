import { ChatOpenRouter } from "@langchain/openrouter";
import { ChatGroq } from "@langchain/groq";
import { ChatMistralAI } from "@langchain/mistralai";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { llmConfig } from "./llm.config.js";

class LLMProviders {
    #openRouter;
    #groq;
    #mistral;
    #huggingFace;

    #requireKey(key, provider) {
        if (!key) {
            throw new Error(
                `${provider} API key is missing.`
            );
        }
        return key;
    }

    // OPENROUTER
    get openRouter() {
        if (!this.#openRouter) {
            const config = llmConfig.openrouter;

            this.#openRouter = new ChatOpenRouter({
                apiKey: this.#requireKey(
                    config.apiKey,
                    "OpenRouter"
                ),
                model: config.model,
                temperature: config.temperature,
                maxRetries: config.maxRetries
            });
        }

        return this.#openRouter;
    }

    // GROQ
    get groq() {
        if (!this.#groq) {
            const config = llmConfig.groq;

            this.#groq = new ChatGroq({
                apiKey: this.#requireKey(
                    config.apiKey,
                    "Groq"
                ),

                model: config.model,
                temperature: config.temperature,
                maxRetries: config.maxRetries
            });
        }

        return this.#groq;
    }

    // MISTRAL
    get mistral() {
        if (!this.#mistral) {
            const config = llmConfig.mistral;

            this.#mistral = new ChatMistralAI({
                apiKey: this.#requireKey(
                    config.apiKey,
                    "Mistral"
                ),

                model: config.model,
                temperature: config.temperature,
                maxRetries: config.maxRetries
            });
        }

        return this.#mistral;
    }

    // HUGGING FACE
    get huggingFace() {
        if (!this.#huggingFace) {
            const config = llmConfig.huggingface;

            this.#huggingFace =
                new HuggingFaceInferenceEmbeddings({
                    apiKey: this.#requireKey(
                        config.apiKey,
                        "Hugging Face"
                    ),

                    model: config.model
                });
        }

        return this.#huggingFace;
    }
}

const llmProviders = new LLMProviders();

export default llmProviders;