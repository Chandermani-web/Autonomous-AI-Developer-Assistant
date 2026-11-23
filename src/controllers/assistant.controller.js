import assistantAgent from "../agent/assistant.agent.js";
import { Command } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import formatResponse from "../utils/response.formatter.js";
import { getSessions } from "../services/dashboardService.service.js";

class AssistantController {
    sessions = async (_req, res) => {
        try {
            res.json({ success: true, data: await getSessions() });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    chat = async (req, res) => {
        try {
            const { message, sessionId: requestedSessionId, approved } = req.body;
            const sessionId = requestedSessionId || randomUUID();
            if (approved === undefined && !message) {
                return res.status(400).json({ success: false, message: "Message is required." });
            }
            const config = { configurable: { thread_id: sessionId } };
            const response = approved === undefined
                ? await assistantAgent.invoke({ messages: [{ role: "user", content: message }] }, config)
                : await assistantAgent.invoke(new Command({ resume: approved }), config);
            
            // Check for any interrupts in the response
            const interrupts = response.__interrupt__ || [];

            if (interrupts.length) {
                const action = interrupts[0].value;

                let approvalMessage = "";

                if (action.action === "send_email") {
                    approvalMessage = `Do you want to send this email?
                        To: ${action.to}
                        Subject: ${action.subject}`;
                } else if (action.action === "delete_email") {
                        approvalMessage = `Do you want to move this email to Trash?
                        Email ID: ${action.messageId}`;
                }

                return res.status(200).json({
                    success: true,
                    sessionId,
                    approvalRequired: true,
                    approvals: [{
                        action: action.action,
                        to: action.to,
                        subject: action.subject,
                        messageId: action.messageId
                    }],
                    response: approvalMessage
                });
            }
            return res.status(200).json({
                success: true,
                sessionId,
                approvalRequired: false,
                response: formatResponse(response.messages?.at(-1)?.content || "")
            });
        } catch (error) {
            console.error("Assistant Agent Error:", error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // stream = async (req, res) => {
    //     const { message, sessionId: requestedSessionId } = req.body;
    //     const sessionId = requestedSessionId || randomUUID();
    //     if (!message) {
    //         return res.status(400).json({ success: false, message: "Message is required." });
    //     }
    //     const abortController = new AbortController();
    //     res.setHeader("Content-Type", "text/event-stream");
    //     res.setHeader("Cache-Control", "no-cache, no-transform");
    //     res.setHeader("Connection", "keep-alive");
    //     res.flushHeaders();
    //     res.on("close", () => {
    //         if (!res.writableEnded) abortController.abort();
    //     });
    //     try {
    //         const stream = await assistantAgent.stream(
    //             { messages: [{ role: "user", content: message }] },
    //             { configurable: { thread_id: sessionId }, streamMode: "messages", signal: abortController.signal }
    //         );
    //         for await (const [chunk] of stream) {
    //             if (res.destroyed) break;
    //             const content = chunk.content;
    //             const token = typeof content === "string"
    //                 ? content
    //                 : Array.isArray(content)
    //                     ? content.filter(item => item.type === "text").map(item => item.text).join("")
    //                     : "";
    //             if (token) {
    //                 res.write(`data: ${JSON.stringify({ formatResponse: formatResponse(token), type: sessionId })}\n\n`);
    //             }
    //         }
    //         if (!res.destroyed) {
    //             res.write(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`);
    //             res.end();
    //         }
    //     } catch (error) {
    //         if (abortController.signal.aborted) return;
    //         console.error("Stream Error:", error.message);
    //         if (!res.destroyed) {
    //             res.write(`data: ${JSON.stringify({ error: "Unable to generate response." })}\n\n`);
    //             res.end();
    //         }
    //     }
    // };
}

export default new AssistantController();