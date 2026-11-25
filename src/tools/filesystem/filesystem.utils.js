import path from "node:path";
import { access, realpath, stat, readdir} from "node:fs/promises";

import { FILESYSTEM_ROOT, GENERATED_DIR, EXCLUDED_DIRS} from "./filesystem.config.js";

const isInside = (parent, target) => {
    const relative = path.relative(parent, target);

    return (
        relative === "" ||
        (
            !relative.startsWith(`..${path.sep}`) &&
            relative !== ".." &&
            !path.isAbsolute(relative)
        )
    );
};

export function validateRelativePath(inputPath) {
    if (typeof inputPath !== "string" || !inputPath.trim()) {
        throw new Error("A valid relative path is required.");
    }

    if (path.isAbsolute(inputPath)) {
        throw new Error("Absolute paths are not allowed. Use relative paths.");
    }

    const segments = inputPath.split(/[\\/]+/);

    if (
        segments.some(segment =>
            segment === ".." ||
            EXCLUDED_DIRS.has(segment.toLowerCase())
        )
    ) {
        throw new Error("Access to this path is not allowed.");
    }

    return path.normalize(inputPath);
}

export async function getRootPath() {
    const root = await realpath(FILESYSTEM_ROOT);

    return root;
}

export async function resolveReadPath(inputPath) {
    const safePath = validateRelativePath(inputPath);
    const root = await getRootPath();

    const target = path.resolve(root, safePath);

    if (!isInside(root, target)) {
        throw new Error("Path is outside the allowed filesystem root.");
    }

    const resolved = await realpath(target);

    if (!isInside(root, resolved)) {
        throw new Error("Access outside the allowed root is blocked.");
    }

    const segments = path.relative(root, resolved).split(path.sep);

    if (segments.some(segment =>
        EXCLUDED_DIRS.has(segment.toLowerCase())
    )) {
        throw new Error("Access to excluded directories is blocked.");
    }

    return resolved;
}

export async function resolveWritePath(inputPath) {
    const safePath = validateRelativePath(inputPath);
    const root = await getRootPath();
    const generatedRoot = await realpath(GENERATED_DIR);

    if (!isInside(root, generatedRoot)) {
        throw new Error("generated/ must be inside the allowed filesystem root.");
    }

    const target = path.resolve(generatedRoot, safePath);

    if (!isInside(generatedRoot, target) || target === generatedRoot) {
        throw new Error("Writes are allowed only inside generated/.");
    }

    const parent = await realpath(path.dirname(target));

    if (!isInside(generatedRoot, parent)) {
        throw new Error("Write path escapes generated/.");
    }

    const targetSegments = path.relative(generatedRoot, target).split(path.sep);

    if (targetSegments.some(segment =>
        EXCLUDED_DIRS.has(segment.toLowerCase())
    )) {
        throw new Error("Writing to excluded directories is not allowed.");
    }

    try {
        await access(target);

        const resolvedTarget = await realpath(target);

        if (!isInside(generatedRoot, resolvedTarget)) {
            throw new Error("Write target escapes generated/.");
        }
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    return target;
}

export async function collectFiles(directory, recursive = false) {
    const results = [];
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        if (
            entry.isSymbolicLink() ||
            EXCLUDED_DIRS.has(entry.name.toLowerCase())
        ) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            results.push({
                name: entry.name,
                type: "directory",
                path: path.relative(FILESYSTEM_ROOT, fullPath)
            });

            if (recursive) {
                results.push(
                    ...await collectFiles(fullPath, true)
                );
            }
        } else if (entry.isFile()) {
            results.push({
                name: entry.name,
                type: "file",
                path: path.relative(FILESYSTEM_ROOT, fullPath)
            });
        }
    }

    return results;
}

export async function getFileStats(filePath) {
    const fileStat = await stat(filePath);

    return {
        size: fileStat.size,
        sizeInKB: Number((fileStat.size / 1024).toFixed(2)),
        createdAt: fileStat.birthtime,
        modifiedAt: fileStat.mtime,
        isFile: fileStat.isFile(),
        isDirectory: fileStat.isDirectory()
    };
}