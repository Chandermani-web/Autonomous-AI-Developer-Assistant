import { Worker } from "bullmq";
import gmail from "../tools/gmail/gmail.config.js";
import bullmqRedis from "../config/bullmq.redis.js";
import dotenv from "dotenv";
dotenv.config();

const emailWorker = new Worker(
    "emailQueue", async (job) => {
        const { messageIds } = job.data;
        const results = [];

        for (const messageId of messageIds) {
            try {
                await gmail.users.messages.trash({
                    userId: "me",
                    id: messageId
                });

                results.push({ messageId, success: true });
            } catch (error) {
                results.push({
                    messageId,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    },
    { connection: bullmqRedis, concurrency: 2 }
);

emailWorker.on("completed", job =>
    console.log(`Email job ${job.id} completed`)
);

emailWorker.on("failed", (job, error) =>
    console.error(`Email job ${job?.id} failed:`, error.message)
);