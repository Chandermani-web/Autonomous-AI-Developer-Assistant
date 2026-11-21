
import llmEngine from "../lib/llm.engine.js";

class ChatController {
    chat = async (req, res) => {
        try {
            const { messages } = req.body;
            if (!messages || typeof messages !== "string") return res.status(400).json({ success: false, message: "Messages must be a valid string." });

            const response = await llmEngine.chat(messages);
            return res.status(200).json({ chat: response.content });
        } catch (error) {
            console.error("Chat Error:", error);
            return res.status(500).json({ message: "Internal Server Error", error: error.message });
        }
    };

    streamChat = async (req, res) => {
        try {
            const { messages } = req.body;
            if (!messages || typeof messages !== "string") return res.status(400).json({ success: false, message: "Messages must be a valid string." });

            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders();

            const stream = await llmEngine.streamChat(messages);
            for await (const chunk of stream) {
                if (res.destroyed) break;
                if (chunk.content) res.write(`data: ${JSON.stringify({ token: chunk.content })}\n\n`);
            }

            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
            }
        } catch (error) {
            console.error("Stream Error:", error);
            if (!res.headersSent) return res.status(500).json({ message: "Internal Server Error", error: error.message });
            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                res.end();
            }
        }
    };
}

export default new ChatController();