import { Worker } from "bullmq";
import IORedis from "ioredis";
import gmail from "../../tools/gmail/gmail.config.js";
import bullmqRedis from "../../config/bullmq.redis.js";
import dotenv from "dotenv";
dotenv.config();

// const connection = new IORedis(process.env.REDIS_URL, {
//     maxRetriesPerRequest: null
// });

// const connection = new IORedis(process.env.REDIS_URL, {
//     maxRetriesPerRequest: null,
//     retryStrategy(times) {
//         return Math.min(times * 1000, 5000);
//     }
// });

const deleteWorker = new Worker(
    "deleteEmailQueue", async (job) => {
        const { messageIds } = job.data;
        const results = [];

        for(const messageId of messageIds) {
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
    { connection: bullmqRedis, concurrency: 2}
)

deleteWorker.on("completed", job =>
    console.log(`Delete job ${job.id} completed`)
);

deleteWorker.on("failed", (job, error) =>
    console.error(`Delete job ${job?.id} failed:`, error.message)
);