
import { githubTools } from "./github/github.tools.js";
import { gmailTools } from "./gmail/gmail.tools.js";
import { searchWeb } from "./web/search.tool.js";
import { openWebpage } from "./browser/browser.tools.js";
import { postgresTools } from "./postgres/postgres.tools.js"
import { documentTools } from "./documents/document.tools.js";
import { filesystemTools } from "./filesystem/filesystem.tools.js";
import { researchTools } from "./research/research.tools.js";

export const allTools = [
    ...githubTools,
    ...gmailTools,
    searchWeb,
    openWebpage,
    ...postgresTools,
    ...documentTools,
    ...filesystemTools,
    ...researchTools
];

console.log("Registered Tools:", allTools.map(tool => tool.name));

export const toolMap = {
    github: githubTools,
    gmail: gmailTools,
    web: searchWeb,
    browser: openWebpage,
    postgres: postgresTools,
    documents: documentTools,
    filesystem: filesystemTools,
    research: researchTools
};