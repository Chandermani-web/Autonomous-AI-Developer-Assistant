import app from "../src/main.js";
import process from "node:process";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Worker ${process.pid} running on port ${PORT}`);
});

let shuttingDown = false;

const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`Worker ${process.pid} shutting down...`);

    server.close(async () => {
        try {
            console.log(`Worker ${process.pid} closed`);
            process.exit(0);
        } catch (error) {
            console.error("Shutdown error:", error);
            process.exit(1);
        }
    });

    setTimeout(() => process.exit(1), 12000).unref();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);