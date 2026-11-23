import IORedis from "ioredis";
import "dotenv/config";

const bullmqRedis = new IORedis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: "default",
    password: process.env.REDIS_PASSWORD,

    maxRetriesPerRequest: null,
    retryStrategy(times) {
        return Math.min(times * 1000, 5000);
    }
});

bullmqRedis.on("ready", () => {
    console.log("BullMQ Redis ready");
});

bullmqRedis.on("error", (err) => {
    console.error("BullMQ Redis error:", err.message);
});

export default bullmqRedis;