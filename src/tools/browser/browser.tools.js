
import { tool } from "@langchain/core/tools";
import { chromium } from "playwright";
import { z } from "zod";

const browserTool = async (url) => {
    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

        return await page.evaluate(() => ({
            title: document.title,
            url: location.href,
            content: document.body.innerText.slice(0, 12000),
            links: Array.from(document.querySelectorAll("a[href]"))
                .slice(0, 30)
                .map(a => ({ text: a.innerText.trim(), url: a.href }))
        }));
    } finally {
        await browser.close();
    }
};

export const openWebpage = tool(
    async ({ url }) => JSON.stringify(await browserTool(url)),
    {
        name: "open_webpage",
        description: "Open a webpage and extract its title, text content, and links.",
        schema: z.object({
            url: z.string().url()
        })
    }
);
