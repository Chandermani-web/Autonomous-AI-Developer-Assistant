import { tool } from "@langchain/core/tools";
import { z } from "zod";
import postgres from "./postgres.config.js";

export const listDatabases = tool(async () => {
    const { rows } = await postgres.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false"
    );
    return JSON.stringify(rows);
}, {
    name: "list_databases",
    description: "List all accessible PostgreSQL databases.",
    schema: z.object({})
});

export const listTables = tool(async ({ schema }) => {
    const { rows } = await postgres.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
        [schema]
    );
    return JSON.stringify(rows);
}, {
    name: "list_tables",
    description: "List tables inside a PostgreSQL schema, usually public.",
    schema: z.object({ schema: z.string().default("public") })
});

export const describeTable = tool(async ({ table, schema }) => {
    const { rows } = await postgres.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, table]
    );
    return JSON.stringify(rows);
}, {
    name: "describe_table",
    description: "Get column names, data types and constraints information for a table.",
    schema: z.object({
        table: z.string(),
        schema: z.string().default("public")
    })
});

export const getTableData = tool(async ({ table, schema, limit }) => {
    const { rows } = await postgres.query(
        `SELECT * FROM "${schema}"."${table}" LIMIT $1`,
        [limit]
    );
    return JSON.stringify(rows);
}, {
    name: "get_table_data",
    description: "Retrieve records from a PostgreSQL table.",
    schema: z.object({
        table: z.string(),
        schema: z.string().default("public"),
        limit: z.number().int().min(1).max(100).default(10)
    })
});

export const searchTableData = tool(async ({ table, schema, column, value, limit }) => {
    const { rows } = await postgres.query(
        `SELECT * FROM "${schema}"."${table}"
         WHERE "${column}"::text ILIKE $1 LIMIT $2`,
        [`%${value}%`, limit]
    );
    return JSON.stringify(rows);
}, {
    name: "search_table_data",
    description: "Find specific records in a table by searching a column for matching text.",
    schema: z.object({
        table: z.string(),
        schema: z.string().default("public"),
        column: z.string(),
        value: z.string(),
        limit: z.number().int().min(1).max(100).default(10)
    })
});

export const executeSQL = tool(async ({ query }) => {
    if (!/^\s*(SELECT|WITH|EXPLAIN)\b/i.test(query) ||
        /;|--|\/\*|\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(query)) {
        return "Only a single read-only SQL query is allowed.";
    }

    const { rows } = await postgres.query({
        text: `SET TRANSACTION READ ONLY; ${query}`
    }).catch(() => ({ rows: [] }));

    return JSON.stringify(rows);
}, {
    name: "execute_sql",
    description: "Execute a custom read-only SQL query to retrieve or analyze database records.",
    schema: z.object({ query: z.string().min(1) })
});

export const postgresTools = [
    listDatabases,
    listTables,
    describeTable,
    getTableData,
    searchTableData,
    executeSQL
];