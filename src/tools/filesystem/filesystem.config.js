import path from "node:path";

export const FILESYSTEM_ROOT = path.resolve(
    "C:/Users/himanshu/OneDrive/Desktop/Placement"
);

// Only this directory can be modified by filesystem tools.
export const GENERATED_DIR = path.resolve(
    "C:/Users/himanshu/OneDrive/Desktop/Placement/Backend_Mern/postgres/generated"
);

// Directories excluded at every level.
export const EXCLUDED_DIRS = new Set([
    "node_modules",
    "venv"
]);

// Maximum file size Astra can read: 1 MB.
export const MAX_READ_SIZE = 1024 * 1024;

// Maximum file size Astra can search: 1 MB.
export const MAX_SEARCH_FILE_SIZE = 1024 * 1024;

// Maximum search results.
export const MAX_SEARCH_RESULTS = 50;