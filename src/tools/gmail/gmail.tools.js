import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import gmail from "./gmail.config.js";

export const searchEmails = tool(async ({ query, maxResults }) => {
    const { data } = await gmail.users.messages.list({ userId: "me", q: query, maxResults });
    return JSON.stringify(data.messages || []);
}, {
    name: "search_emails",
    description: "Search Gmail messages using a Gmail search query.",
    schema: z.object({ query: z.string(), maxResults: z.number().optional().default(10) })
});

export const readEmail = tool(async ({ messageId }) => {
    const { data } = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    const headers = data.payload?.headers || [];
    const getHeader = name => headers.find(h => h.name === name)?.value || "";
    return JSON.stringify({ id: data.id, from: getHeader("From"), to: getHeader("To"), subject: getHeader("Subject"), date: getHeader("Date"), snippet: data.snippet, body: data.payload?.body?.data || "" });
}, {
    name: "read_email",
    description: "Read a Gmail message by its message ID.",
    schema: z.object({ messageId: z.string() })
});

export const listLabels = tool(async () => {
    const { data } = await gmail.users.labels.list({ userId: "me" });
    return JSON.stringify(data.labels || []);
}, {
    name: "list_gmail_labels",
    description: "List all Gmail labels.",
    schema: z.object({})
});

export const createDraft = tool(async ({ to, subject, body }) => {
    const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
    const encodedMessage = Buffer.from(message).toString("base64url");
    const { data } = await gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw: encodedMessage } } });
    return JSON.stringify({ success: true, draftId: data.id });
}, {
    name: "create_email_draft",
    description: "Create a Gmail draft without sending it.",
    schema: z.object({ to: z.string().email(), subject: z.string(), body: z.string() })
});

export const sendEmail = tool(async ({ to, subject, body }) => {
    const approval = interrupt({ action: "send_email", to, subject, body, message: "Do you approve sending this email?" });
    if (approval !== true) return "Email sending rejected by user.";
    const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
    const encodedMessage = Buffer.from(message).toString("base64url");
    const { data } = await gmail.users.messages.send({ userId: "me", requestBody: { raw: encodedMessage } });
    return JSON.stringify({ success: true, messageId: data.id });
}, {
    name: "send_email",
    description: "Send an email only after explicit human approval through the application's approval flow.",
    schema: z.object({ to: z.string().email(), subject: z.string(), body: z.string() })
});

export const deleteEmail = tool(async ({ messageId }) => {
    const approval = interrupt({ action: "delete_email", messageId, message: "Do you approve moving this email to Trash?" });
    if (approval !== true) return "Email deletion rejected by user.";
    await gmail.users.messages.trash({ userId: "me", id: messageId });
    return JSON.stringify({ success: true, message: "Email moved to Trash." });
}, {
    name: "delete_email",
    description: "Move an email to Gmail Trash only after explicit human approval through the application's approval flow.",
    schema: z.object({ messageId: z.string() })
});

export const gmailTools = [searchEmails, readEmail, listLabels, createDraft, sendEmail, deleteEmail];