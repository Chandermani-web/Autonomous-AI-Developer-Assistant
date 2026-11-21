
import "dotenv/config";
import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";

const numCPUs = os.availableParallelism?.() || os.cpus().length;

if (cluster.isPrimary) {
    console.log(`Primary process started: ${process.pid}`);
    console.log(`Available CPU cores: ${numCPUs}`);

    cluster.setupPrimary({
        exec: fileURLToPath(new URL("./worker.js", import.meta.url))
    });

    let shuttingDown = false;

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("online", (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on("exit", (worker, code, signal) => {
        console.error(`Worker ${worker.process.pid} died. Code: ${code}, Signal: ${signal}`);

        if (!shuttingDown) {
            console.log("Restarting worker...");
            cluster.fork();
        }
    });

    const shutdown = () => {
        if (shuttingDown) return;
        shuttingDown = true;

        console.log("Primary process shutting down...");

        for (const worker of Object.values(cluster.workers)) {
            worker?.process.kill("SIGTERM");
        }

        cluster.disconnect(() => {
            console.log("All workers disconnected");
            process.exit(0);
        });

        setTimeout(() => process.exit(1), 15000).unref();
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
