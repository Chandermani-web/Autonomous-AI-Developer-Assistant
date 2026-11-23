import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const postgres = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

export default postgres;