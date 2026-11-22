import express from "express";
import pool from "./config/database.js";
import redisClient from "./config/caching.js";

import userRouter from "./routes/user.route.js";
import profileRouter from "./routes/profile.route.js";
import limiter from "./middlewares/rateLimiter.js";
import chatRouter from "./routes/chat.route.js";
// import agentRouter from "./routes/agent.route.js";
import githubRoutes from "./routes/assistant.route.js";


const app = express();

// Database connectivity check
pool.query("SELECT 1")
    .then(() => console.log(`Worker ${process.pid}: ✔️  Connected to PostgreSQL: ` + process.env.PGPORT))
    .catch(err => console.error("PostgreSQL error:", err));

// Redis connection
redisClient.connect()
    .then(() => console.log(`Worker ${process.pid}: ✔️  Connected to Redis`))
    .catch(err => console.error("Redis connection error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Routes
app.use("/api/user", userRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chat", chatRouter);
// app.use("/api/agent", agentRouter);
app.use("/api/github", githubRoutes);

export default app;