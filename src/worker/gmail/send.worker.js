import { Worker } from "bullmq";
import IORedis from "ioredis";
import gmail from "../../tools/gmail/gmail.config.js";
import bullmqRedis from "../../config/bullmq.redis.js";
import dotenv from "dotenv";
dotenv.config();

// const connection = new IORedis(process.env.REDIS_URL, {
//     maxRetriesPerRequest: null
// });

const sendWorker = new Worker("sendEmailQueue", async (job) => {
    const { to, subject, body } = job.data;

    const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body
    ].join("\r\n");

    const { data } = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
            raw: Buffer.from(message).toString("base64url")
        }
    });

    return { success: true, messageId: data.id };
}, { connection: bullmqRedis, concurrency: 2, limiter: { max: 5, duration: 1000 } });

sendWorker.on("completed", job => {
    console.log(`Send job ${job.id} completed`);
});

sendWorker.on("failed", (job, error) => {
    console.error(`Send job ${job?.id} failed:`, error.message);
});