import express from "express";
import cors from "cors";
import pool from "./config/database.js";
import redisClient from "./config/caching.js";
import morgan from "morgan";
import userRouter from "./routes/user.route.js";
import profileRouter from "./routes/profile.route.js";
import limiter from "./middlewares/rateLimiter.js";
import chatRouter from "./routes/chat.route.js";
// import agentRouter from "./routes/agent.route.js";
import githubRoutes from "./routes/assistant.route.js";
// import dashboardRoutes from "./routes/dashboard.route.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { google } from "googleapis";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

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
app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(morgan("combined"));
// Routes
app.use("/api/user", userRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chat", chatRouter);
// app.use("/api/agent", agentRouter);
app.use("/api/assistant", githubRoutes);
// app.use("/api/dashboard", dashboardRoutes);
app.use(express.static(path.resolve(__dirname, "../public")));

app.get('/api/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).send('Authorization code missing');
        }
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Refresh token:', tokens.refresh_token);
        res.send('Google authorization successful. Check your terminal for the refresh token.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Google authentication failed');
    }
});

export default app;