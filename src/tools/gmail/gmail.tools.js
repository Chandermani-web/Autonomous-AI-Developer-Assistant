import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import gmail from "./gmail.config.js";
import { deleteQueue, sendQueue } from "../../config/queue.config.js";

export const searchEmails = tool(
  async ({ query, maxResults }) => {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });
    return JSON.stringify(data.messages || []);
  },
  {
    name: "search_emails",
    description: "Search Gmail messages using a Gmail search query.",
    schema: z.object({
      query: z.string(),
      maxResults: z.number().optional().default(10),
    }),
  },
);

export const readEmail = tool(
  async ({ messageId }) => {
    const { data } = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });
    const headers = data.payload?.headers || [];
    const getHeader = (name) =>
      headers.find((h) => h.name === name)?.value || "";
    return JSON.stringify({
      id: data.id,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      snippet: data.snippet,
      body: data.payload?.body?.data || "",
    });
  },
  {
    name: "read_email",
    description: "Read a Gmail message by its message ID.",
    schema: z.object({ messageId: z.string() }),
  },
);

export const listLabels = tool(
  async () => {
    const { data } = await gmail.users.labels.list({ userId: "me" });
    return JSON.stringify(data.labels || []);
  },
  {
    name: "list_gmail_labels",
    description: "List all Gmail labels.",
    schema: z.object({}),
  },
);

export const createDraft = tool(
  async ({ to, subject, body }) => {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");
    const encodedMessage = Buffer.from(message).toString("base64url");
    const { data } = await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw: encodedMessage } },
    });
    return JSON.stringify({ success: true, draftId: data.id });
  },
  {
    name: "create_email_draft",
    description: "Create a Gmail draft without sending it.",
    schema: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);

export const sendEmail = tool(
  async ({ to, subject, body }) => {
    const approval = interrupt({
        action: "send_email",
        to,
        subject,
        body,
        message: "Do you approve sending this email?"
    });

    if (approval !== true) return "Email sending rejected.";

    const job = await sendQueue.add("send-email", {
        to, subject, body
    }, {
        attempts: 1,
        removeOnComplete: 100
    });

    return JSON.stringify({
        success: true,
        message: "Email sending queued.",
        jobId: job.id
    });
  },
  {
    name: "send_email",
    description:
      "Send an email only after explicit human approval through the application's approval flow.",
    schema: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);

export const deleteEmail = tool(async ({ messageIds }) => {
    const approval = interrupt({
        action: "delete_email",
        messageIds,
        message: `Do you approve deleting ${messageIds.length} emails?`
    });

    if (approval !== true) return "Email deletion rejected.";

    const job = await deleteQueue.add("bulk-delete", {
        messageIds
    }, {
        attempts: 1,
        removeOnComplete: 100
    });

    return JSON.stringify({
        success: true,
        message: "Bulk deletion queued.",
        jobId: job.id
    });
}, {
    name: "delete_emails",
    description: "Delete multiple Gmail messages after one human approval.",
    schema: z.object({
        messageIds: z.array(z.string()).min(1).max(100)
    })
});

export const gmailTools = [
  searchEmails,
  readEmail,
  listLabels,
  createDraft,
  sendEmail,
  deleteEmail,
];
