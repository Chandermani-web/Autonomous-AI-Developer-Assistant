
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, access } from "node:fs/promises";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const DOCUMENTS_DIR = path.resolve(
    currentDir,
    "../../../generated/documents"
);

export async function getUniqueFilePath(fileName, extension) {
    await mkdir(DOCUMENTS_DIR, { recursive: true });

    const originalName = path.basename(fileName, path.extname(fileName));

    const safeName = originalName
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, "_")
        .replace(/\.+$/g, "")
        .slice(0, 100) || "document";

    let finalName = `${safeName}.${extension}`;
    let counter = 1;
    let outputPath = path.join(DOCUMENTS_DIR, finalName);

    while (true) {
        try {
            await access(outputPath);
            finalName = `${safeName}_${counter}.${extension}`;
            outputPath = path.join(DOCUMENTS_DIR, finalName);
            counter++;
        } catch {
            return {
                fileName: finalName,
                filePath: outputPath,
                relativePath: path.relative(process.cwd(), outputPath)
            };
        }
    }
}
