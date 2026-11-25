import llmProviders from "./llm.providers.js";

class LLMOrchestrator {
    // MODEL ROUTING
    get conversationModel() {
        return llmProviders.openRouter.withFallbacks([
            llmProviders.groq
        ]);
    }

    get fastModel() {
        return llmProviders.groq.withFallbacks([
            llmProviders.openRouter
        ]);
    }

    get summarizationModel() {
        return llmProviders.mistral.withFallbacks([
            llmProviders.openRouter
        ]);
    }

    // MAIN CONVERSATION
    async chat(messages) {
        return await this.conversationModel.invoke(
            messages
        );
    }

    async streamChat(messages) {
        return this.conversationModel.stream(
            messages
        );
    }

    // AGENT MODEL WITH TOOL CALLING
    getAgentModel(tools) {
        if (!Array.isArray(tools)) {
            throw new Error(
                "Agent tools must be provided as an array."
            );
        }

        const primary = llmProviders.openRouter.bindTools(
            tools
        );

        const fallback = llmProviders.groq.bindTools(
            tools
        );

        return primary.withFallbacks([
            fallback
        ]);
    }

    // FAST INFERENCE
    async quickResponse(prompt) {
        return await this.fastModel.invoke(prompt);
    }

    // TEXT PROCESSING
    async summarize(text) {

        return await this.summarizationModel.invoke([
            [
                "system",
                `You are an expert text processing assistant.

                 Create accurate, concise and structured summaries.
                 Preserve important information.
                 Never invent missing information.`
            ],
            [
                "human",
                text
            ]
        ]);
    }

    // EMBEDDINGS
    async generateEmbedding(text) {

        if (typeof text !== "string" || !text.trim()) {
            throw new Error(
                "Valid text is required for embedding."
            );
        }

        return await llmProviders.huggingFace.embedQuery(
            text
        );
    }

    async generateEmbeddings(documents) {
        if (
            !Array.isArray(documents) ||
            documents.length === 0
        ) {
            throw new Error(
                "A non-empty documents array is required."
            );
        }
        return await llmProviders.huggingFace.embedDocuments(
            documents
        );
    }
    
    // TASK ROUTER
    async executeTask(task, input) {

        switch (task) {

            case "conversation":
                return this.chat(input);

            case "fast":
                return this.quickResponse(input);

            case "summarization":
                return this.summarize(input);

            case "embedding":
                return this.generateEmbedding(input);

            case "embeddings":
                return this.generateEmbeddings(input);

            default:
                throw new Error(
                    `Unsupported LLM task: ${task}`
                );
        }
    }

    // PROVIDER INFORMATION
    getAvailableTasks() {
        return [
            "conversation",
            "fast",
            "summarization",
            "embedding",
            "embeddings"
        ];
    }

    print() {
        console.log( `LLM Orchestrator initialized on worker ${process.pid}`);
        console.log( "Primary: OpenRouter | Fallback: Groq");
        console.log( "Specialized: Mistral | Embeddings: Hugging Face");
    }
}

const llmOrchestrator = new LLMOrchestrator();

llmOrchestrator.print();

export default llmOrchestrator;