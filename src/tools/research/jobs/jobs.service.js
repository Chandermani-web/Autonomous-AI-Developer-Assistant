import { researchConfig } from "../research.config.js";
import { tavilySearch, tavilyExtract } from "../research.service.js";
import { buildJobSearchQueries } from "./jobs.sources.js";
import { inferRemoteEligibility, normalizeJob, deduplicateJobs } from "./jobs.utils.js";
import { cleanText, normalizeUrl, truncate } from "../research.utils.js";

function guessCompany(title = "", content = "") {
    // Avoid guessing a company from arbitrary snippets.
    const match = content.match(/(?:company|employer)\s*:\s*([^|,\n.]+)/i);
    return match?.[1]?.trim() || "";
}

function parseListing(result, scope) {
    const combined = `${result.title}\n${result.content}`;
    const eligibility = inferRemoteEligibility(combined, scope);
    return {
        title: cleanText(result.title),
        company: guessCompany(result.title, result.content),
        description: truncate(result.content, 4000),
        experience: null,
        skills: [],
        remoteType: eligibility.eligibility,
        eligibleCountries: eligibility.eligibility === "india-eligible" ? ["India"] : [],
        salary: null,
        location: eligibility.eligibility === "worldwide" ? "Worldwide remote" : null,
        postedDate: result.publishedDate || null,
        applyUrl: normalizeUrl(result.url),
        companyCareerUrl: null,
        recruiterEmail: null,
        sourceUrl: normalizeUrl(result.url),
        eligibility,
    };
}

export async function findRemoteJobs(options = {}) {
    const roles = options.roles?.length ? options.roles : researchConfig.jobs.targetRoles;
    const scope = options.scope || researchConfig.jobs.remoteScope;
    if (!["india", "worldwide", "both"].includes(scope)) {
        throw new Error('scope must be "india", "worldwide", or "both".');
    }

    const queries = buildJobSearchQueries(roles);
    const batches = await Promise.all(
        queries.map((query) => tavilySearch(query, {
            maxResults: Math.max(5, Math.ceil(researchConfig.jobs.maxResults / 2)),
            searchDepth: "advanced",
        }))
    );

    const searchResults = batches.flatMap((batch) => batch.results);
    const uniqueResults = [...new Map(searchResults.map((item) => [item.url, item])).values()];
    const extracted = await tavilyExtract(uniqueResults.slice(0, 15).map((item) => item.url));
    const extractedMap = new Map(extracted.map((item) => [item.url, item.rawContent]));

    const jobs = uniqueResults.map((item) => {
        const content = extractedMap.get(item.url) || item.content;
        const parsed = parseListing({ ...item, content }, scope);
        return normalizeJob(parsed);
    }).filter((job) => {
        const text = `${job.title} ${job.description}`.toLowerCase();
        const roleMatch = roles.some((role) => {
            const tokens = role.toLowerCase().split(/[\s/]+/).filter((token) => token.length > 2);
            return tokens.some((token) => text.includes(token));
        });
        const eligibility = inferRemoteEligibility(
            `${job.remoteType} ${job.location || ""} ${job.description}`,
            scope
        );
        return roleMatch && eligibility.eligibleForSearch && job.applyUrl;
    });

    return {
        searchedAt: new Date().toISOString(),
        scope,
        roles,
        count: deduplicateJobs(jobs).length,
        jobs: deduplicateJobs(jobs).slice(0, options.maxResults || researchConfig.jobs.maxResults),
        limitations: [
            "Search snippets and extracted pages may not expose every job field.",
            "Remote eligibility is classified conservatively and should be verified on the employer's listing.",
            "Recruiter emails are not guessed; this discovery stage does not infer email addresses.",
        ],
    };
}

export async function getJobDetails(url) {
    const safeUrl = normalizeUrl(url);
    if (!safeUrl) throw new Error("A valid job listing URL is required.");

    const extracted = await tavilyExtract([safeUrl]);
    const page = extracted[0];
    if (!page?.rawContent) {
        return {
            url: safeUrl,
            status: "not-found",
            message: "The page could not be extracted. Open the listing in the browser tool to inspect it.",
        };
    }

    const text = cleanText(page.rawContent);
    const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const publicEmails = [...new Set(emailMatches)].filter((email) =>
        !/(example\.com|sentry\.io|wixpress\.com)$/i.test(email)
    );

    return {
        url: safeUrl,
        extractedAt: new Date().toISOString(),
        pageText: truncate(text, 15000),
        publiclyListedEmails: publicEmails,
        note: "This is extracted page content, not a fully verified structured job record. Confirm role, employer, and eligibility against the original listing.",
    };
}
