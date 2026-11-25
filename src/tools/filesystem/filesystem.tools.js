import { tool } from "@langchain/core/tools";
import { z } from "zod";

import {
    readdir,
    readFile,
    writeFile,
    stat,
    mkdir
} from "node:fs/promises";

import path from "node:path";

import {
    FILESYSTEM_ROOT,
    GENERATED_DIR,
    MAX_READ_SIZE,
    MAX_SEARCH_FILE_SIZE,
    MAX_SEARCH_RESULTS
} from "./filesystem.config.js";

import {
    resolveReadPath,
    resolveWritePath,
    collectFiles,
    getFileStats
} from "./filesystem.utils.js";


const success = (data) => JSON.stringify({
    success: true,
    ...data
});

const failure = (error) => JSON.stringify({
    success: false,
    error: error.message
});


// 1. LIST FILES AND DIRECTORIES

export const listFiles = tool(
    async ({ directory = ".", recursive = false }) => {
        try {
            const target = await resolveReadPath(directory);
            const info = await stat(target);

            if (!info.isDirectory()) {
                throw new Error("The supplied path is not a directory.");
            }

            const files = await collectFiles(target, recursive);

            return success({
                directory,
                total: files.length,
                files: files.slice(0, 200)
            });

        } catch (error) {
            return failure(error);
        }
    },
    {
        name: "list_files",
        description:
            "List files and folders inside the allowed filesystem root. " +
            "Can explore directories recursively. Use relative paths such as " +
            "'.' or 'Backend_Mern/postgres/src'. " +
            "node_modules and venv are excluded.",
        schema: z.object({
            directory: z.string().default("."),
            recursive: z.boolean().default(false)
        })
    }
);


// 2. READ FILE

export const readFileTool = tool(
    async ({ filePath }) => {
        try {
            const target = await resolveReadPath(filePath);
            const info = await stat(target);

            if (!info.isFile()) {
                throw new Error("The supplied path is not a file.");
            }

            if (info.size > MAX_READ_SIZE) {
                throw new Error("File is too large to read. Maximum size is 1 MB.");
            }

            const buffer = await readFile(target);

            // Reject likely binary files.
            if (buffer.includes(0)) {
                throw new Error("Binary files cannot be read as text.");
            }

            return success({
                filePath,
                content: buffer.toString("utf8")
            });

        } catch (error) {
            return failure(error);
        }
    },
    {
        name: "read_file",
        description:
            "Read the text content of a file inside the allowed filesystem root. " +
            "Use relative paths. Cannot read node_modules, venv, binary files, " +
            "or files larger than 1 MB.",
        schema: z.object({
            filePath: z.string().min(1)
        })
    }
);


// 3. SEARCH FILE CONTENTS

export const searchFiles = tool(
    async ({ query, directory = ".", caseSensitive = false }) => {
        try {
            const target = await resolveReadPath(directory);
            const info = await stat(target);

            if (!info.isDirectory()) {
                throw new Error("Search path must be a directory.");
            }

            const files = await collectFiles(target, true);
            const matches = [];

            const searchQuery = caseSensitive
                ? query
                : query.toLowerCase();

            for (const file of files) {
                if (file.type !== "file") continue;

                if (matches.length >= MAX_SEARCH_RESULTS) break;

                const fullPath = await resolveReadPath(file.path);
                const fileInfo = await stat(fullPath);

                if (
                    !fileInfo.isFile() ||
                    fileInfo.size > MAX_SEARCH_FILE_SIZE
                ) {
                    continue;
                }

                const buffer = await readFile(fullPath);

                if (buffer.includes(0)) continue;

                const content = buffer.toString("utf8");
                const lines = content.split(/\r?\n/);

                for (let index = 0; index < lines.length; index++) {
                    const line = lines[index];

                    const searchableLine = caseSensitive
                        ? line
                        : line.toLowerCase();

                    if (searchableLine.includes(searchQuery)) {
                        matches.push({
                            filePath: file.path,
                            line: index + 1,
                            content: line.trim().slice(0, 300)
                        });

                        if (matches.length >= MAX_SEARCH_RESULTS) break;
                    }
                }
            }

            return success({
                query,
                totalMatches: matches.length,
                results: matches
            });

        } catch (error) {
            return failure(error);
        }
    },
    {
        name: "search_files",
        description:
            "Search for text inside files under a directory. " +
            "Useful for finding functions, variables, configuration values, " +
            "and code references. Excludes node_modules and venv.",
        schema: z.object({
            query: z.string().min(1),
            directory: z.string().default("."),
            caseSensitive: z.boolean().default(false)
        })
    }
);


// 4. GET FILE INFORMATION

export const getFileInfo = tool(
    async ({ filePath }) => {
        try {
            const target = await resolveReadPath(filePath);
            const info = await getFileStats(target);

            return success({
                filePath,
                ...info
            });

        } catch (error) {
            return failure(error);
        }
    },
    {
        name: "get_file_info",
        description:
            "Get file or directory metadata, including size, creation date, " +
            "last modified date, and type.",
        schema: z.object({
            filePath: z.string().min(1)
        })
    }
);


// 5. CREATE A NEW FILE INSIDE generated/

export const createFile = tool(
    async ({ filePath, content }) => {
        try {
            await mkdir(GENERATED_DIR, { recursive: true });

            const target = await resolveWritePath(filePath);

            // wx prevents accidentally overwriting an existing file.
            await writeFile(target, content, {
                encoding: "utf8",
                flag: "wx"
            });

            return success({
                message: "File created successfully.",
                filePath: path.relative(FILESYSTEM_ROOT, target)
            });

        } catch (error) {
            return failure(error);
        }
    },
    {
        name: "create_file",
        description:
            "Create a new text file inside the project's generated directory. " +
            "Cannot overwrite an existing file. Provide a path relative to generated/.",
        schema: z.object({
            filePath: z.string().min(1),
            content: z.string()
        })
    }
);


// 6. WRITE OR UPDATE A FILE INSIDE generated/

export const writeFileTool = tool(
    async ({ filePath, content }) => {
        try {
            await mkdir(GENERATED_DIR, { recursive: true });

            const target = await resolveWritePath(filePath);

            await writeFile(target, content, {
                encoding: "utf8"
            });

            return success({
                message: "File written successfully.",
                filePath: path.relative(FILESYSTEM_ROOT, target)
            });

        } catch (error) {
            return failure(error);
        }
    },
    {
        name: "write_file",
        description:
            "Write or update a text file inside the project's generated directory. " +
            "Cannot modify files outside generated/. Provide a path relative to generated/.",
        schema: z.object({
            filePath: z.string().min(1),
            content: z.string()
        })
    }
);


// EXPORT ALL FILESYSTEM TOOLS

export const filesystemTools = [
    listFiles,
    readFileTool,
    searchFiles,
    getFileInfo,
    createFile,
    writeFileTool
];