
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
    Document,
    Packer,
    Paragraph,
    HeadingLevel
} from "docx";
import ExcelJS from "exceljs";
import { writeFile } from "node:fs/promises";
import { getUniqueFilePath } from "./document.config.js";

const cellSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null()
]);

// 1. Create Word document
export const createDocument = tool(
    async ({ fileName, title, content }) => {
        try {
            const output = await getUniqueFilePath(fileName, "docx");

            const paragraphs = [
                new Paragraph({
                    text: title,
                    heading: HeadingLevel.TITLE,
                    spacing: { after: 300 }
                }),
                ...content.split("\n").map(line =>
                    new Paragraph({
                        text: line,
                        spacing: { after: 120 }
                    })
                )
            ];

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: paragraphs
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            await writeFile(output.filePath, buffer);

            return JSON.stringify({
                success: true,
                message: "Word document created successfully.",
                fileName: output.fileName,
                filePath: output.relativePath,
                format: "DOCX"
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
    {
        name: "create_document",
        description: "Create a formatted Word DOCX document from a title and text content. Use this when the user asks to create reports, notes, letters, documentation, or other Word documents.",
        schema: z.object({
            fileName: z.string().min(1).describe("File name without needing to include the .docx extension."),
            title: z.string().min(1).describe("Document title."),
            content: z.string().min(1).describe("Complete document content. Use newline characters to separate paragraphs.")
        })
    }
);

// 2. Create Excel workbook
export const createSpreadsheet = tool(
    async ({ fileName, sheets }) => {
        try {
            const output = await getUniqueFilePath(fileName, "xlsx");
            const workbook = new ExcelJS.Workbook();

            workbook.creator = "AI Assistant";
            workbook.created = new Date();

            for (const sheetData of sheets) {
                const worksheet = workbook.addWorksheet(sheetData.name);

                worksheet.addRow(sheetData.headers);

                const header = worksheet.getRow(1);
                header.font = { bold: true };
                header.alignment = { vertical: "middle" };

                for (const row of sheetData.rows) {
                    worksheet.addRow(row);
                }

                worksheet.columns = sheetData.headers.map(header => ({
                    header,
                    key: header,
                    width: Math.min(Math.max(String(header).length + 5, 15), 35)
                }));

                worksheet.views = [{ state: "frozen", ySplit: 1 }];
            }

            await workbook.xlsx.writeFile(output.filePath);

            return JSON.stringify({
                success: true,
                message: "Excel workbook created successfully.",
                fileName: output.fileName,
                filePath: output.relativePath,
                format: "XLSX",
                sheetsCreated: sheets.length
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
    {
        name: "create_spreadsheet",
        description: "Create an Excel XLSX workbook with one or multiple sheets, headers, and rows. Use this for reports, tables, budgets, records, calculations, and structured datasets.",
        schema: z.object({
            fileName: z.string().min(1).describe("Workbook file name."),
            sheets: z.array(
                z.object({
                    name: z.string().min(1).max(31).describe("Excel worksheet name."),
                    headers: z.array(z.string()).min(1).describe("Column headers."),
                    rows: z.array(z.array(cellSchema)).describe("Rows of data. Each row should follow the header order.")
                })
            ).min(1)
        })
    }
);

// 3. Create CSV file
export const createCsv = tool(
    async ({ fileName, headers, rows }) => {
        try {
            const output = await getUniqueFilePath(fileName, "csv");

            const escapeCsvValue = value => {
                if (value === null || value === undefined) return "";

                const text = String(value);

                if (/[",\r\n]/.test(text)) {
                    return `"${text.replace(/"/g, '""')}"`;
                }

                return text;
            };

            const csvContent = [
                headers.map(escapeCsvValue).join(","),
                ...rows.map(row =>
                    headers.map((_, index) =>
                        escapeCsvValue(row[index])
                    ).join(",")
                )
            ].join("\r\n");

            await writeFile(output.filePath, "\uFEFF" + csvContent, "utf8");

            return JSON.stringify({
                success: true,
                message: "CSV file created successfully.",
                fileName: output.fileName,
                filePath: output.relativePath,
                format: "CSV",
                rowsCreated: rows.length
            });
        } catch (error) {
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    },
    {
        name: "create_csv",
        description: "Create a CSV file containing column headers and structured rows. Use this when the user requests CSV exports, contact lists, datasets, or tabular records.",
        schema: z.object({
            fileName: z.string().min(1).describe("CSV file name."),
            headers: z.array(z.string()).min(1).describe("CSV column headers."),
            rows: z.array(z.array(cellSchema)).describe("Data rows. Values must follow the header order.")
        })
    }
);

export const documentTools = [
    createDocument,
    createSpreadsheet,
    createCsv
];