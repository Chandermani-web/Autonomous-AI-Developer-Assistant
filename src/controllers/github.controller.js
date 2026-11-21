import assistantAgent from "../agent/github.agent.js";
import { randomUUID } from "node:crypto";
import formatResponse from "../utils/response.formatter.js";

class GitHubController {
    chat = async (req, res) => {
        try {            
            const { message, sessionId: requestedSessionId } = req.body;
            const sessionId = requestedSessionId || randomUUID();

            const response = await assistantAgent.invoke(
                { messages: [{ role: "user", content: message }] },
                { configurable: { thread_id: sessionId } }
            );

            return res.status(200).json({
                success: true,
                sessionId,
                response: formatResponse(response.messages.at(-1).content)
            });
        } catch (error) {
            console.error("GitHub Agent Error:", error.message);
            return res.status(500).json({
                success: false,
                message: error.message
            });
            
        }
    };

    stream = async (req, res) => {
        const { message, sessionId: requestedSessionId } = req.body;
        const sessionId = requestedSessionId || randomUUID();

        if (!message || !sessionId) {
            return res.status(400).json({
                success: false,
                message: "Message and sessionId are required."
            });
        }

        const abortController = new AbortController();

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        res.on("close", () => {
            if (!res.writableEnded) abortController.abort();
        });

        try {
            const stream = await assistantAgent.stream(
                {
                    messages: [{ role: "user", content: message }]
                },
                {
                    configurable: { thread_id: sessionId },
                    streamMode: "messages",
                    signal: abortController.signal
                }
            );

            for await (const [chunk, metadata] of stream) {
                if (res.destroyed) break;
                const content = chunk.content;
                const token = typeof content === "string"
                    ? content
                    : Array.isArray(content)
                        ? content.filter(item => item.type === "text")
                            .map(item => item.text).join("")
                        : "";
                if (token) {
                    res.write(`data: ${JSON.stringify({ formatResponse: formatResponse(token) })}\n\n`);
                }
            }
            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
            }
        } catch (error) {
            if (abortController.signal.aborted) return;
            console.error("Stream Error:", error.message);
            if (!res.destroyed) {
                res.write(`data: ${JSON.stringify({
                    error: "Unable to generate response."
                })}\n\n`);
                res.end();
            }
        }
    };
}

export default new GitHubController();