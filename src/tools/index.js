
import { githubTools } from "./github/github.tools.js";
import { gmailTools } from "./gmail/gmail.tools.js";
import { searchWeb } from "./web/search.tool.js";
import { openWebpage } from "./browser/browser.tools.js";
import { postgresTools } from "./postgres/postgres.tools.js"

export const allTools = [
    ...githubTools,
    ...gmailTools,
    searchWeb,
    openWebpage,
    ...postgresTools
];

console.log("Registered Tools:", allTools.map(tool => tool.name));

export const toolMap = {
    github: githubTools,
    gmail: gmailTools,
    web: searchWeb,
    browser: openWebpage,
    postgres: postgresTools
};