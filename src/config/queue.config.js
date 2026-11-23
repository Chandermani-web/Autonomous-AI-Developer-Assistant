import IORedis from "ioredis";
import { Queue } from "bullmq";
import "dotenv/config";

export const queueRedis = new IORedis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: "default",
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        return Math.min(times * 1000, 5000);
    }
});

export const emailQueue = new Queue("emailQueue", {
    connection: queueRedis
});

export const deleteQueue = new Queue("deleteEmailQueue", {
    connection: queueRedis
});

export const sendQueue = new Queue("sendEmailQueue", {
    connection: queueRedis
});