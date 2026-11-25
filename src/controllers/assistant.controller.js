import assistantAgent from "../agent/assistant.agent.js";
import { Command } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import formatResponse from "../utils/response.formatter.js";
import { getSessions } from "../services/session.service.js";

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

            if (approved === undefined && (typeof message !== "string" || !message.trim())) {
                return res.status(400).json({ success: false, message: "Message is required." });
            }
            if (approved !== undefined && typeof approved !== "boolean") {
                return res.status(400).json({ success: false, message: "Approval must be a boolean." });
            }

            const config = { recursionLimit: 50, configurable: { thread_id: sessionId } };
            const response = approved === undefined
                ? await assistantAgent.invoke({ messages: [{ role: "user", content: message }] }, config)
                : await assistantAgent.invoke(new Command({ resume: approved }), config);

            const interrupts = response.__interrupt__ || [];
            if (interrupts.length) {
                const action = interrupts[0].value;
                let approvalMessage = "This action requires your approval.";

                if (action.action === "send_email") {
                    approvalMessage = `Do you want to send this email?\nTo: ${action.to}\nSubject: ${action.subject}`;
                } else if (action.action === "delete_email") {
                    approvalMessage = `Do you want to move this email to Trash?\nEmail ID: ${action.messageId}`;
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

    stream = async (req, res) => {
        const { message, sessionId: requestedSessionId } = req.body;
        const sessionId = requestedSessionId || randomUUID();

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required."
            });
        }

        const config = {
            recursionLimit: 50,
            configurable: { thread_id: sessionId }
        };

        try {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders?.();

            const sendEvent = (event, data) => {
                res.write(`event: ${event}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            };

            sendEvent("session", { sessionId });

            const stream = await assistantAgent.stream({
                    messages: [
                        { role: "user", content: message }
                    ]
                },
                {
                    ...config,
                    streamMode: "messages"
                }
            );

            for await (const [chunk, metadata] of stream) {
                if (metadata?.langgraph_node !== "agent") continue;
                const content = chunk.content;

                if (typeof content === "string" && content.length > 0) {
                    sendEvent("token", { content });
                } else if (Array.isArray(content)) {
                    for (const block of content) {
                        if (block.type === "text" && block.text) {
                            sendEvent("token", { content: block.text });
                        }
                    }
                }
            }

            // Check whether LangGraph paused execution for approval.
            const snapshot = await assistantAgent.getState(config);

            const interrupts = snapshot.tasks
                ?.flatMap(task => task.interrupts || []) || [];

            if (interrupts.length > 0) {
                const action = interrupts[0].value;
                let approvalMessage = "This action requires your approval.";

                if (action.action === "send_email") {
                    approvalMessage =
                        `Do you want to send this email?\nTo: ${action.to}\nSubject: ${action.subject}`;
                } else if (action.action === "delete_email") {
                    approvalMessage =
                        `Do you want to move this email to Trash?\nEmail ID: ${action.messageId}`;
                }

                sendEvent("approval", {
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
            } else {
                sendEvent("done", { sessionId, approvalRequired: false });
            }
            res.end();
        } catch (error) {
            console.error("Assistant Streaming Error:", error);
            if (!res.headersSent) {
                return res.status(500).json({ success: false, message: error.message });
            }
            if (!res.writableEnded) {
                res.write( `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n` );
                res.end();
            }
        }
    };
}

export default new AssistantController();
