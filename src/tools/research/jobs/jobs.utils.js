import { cleanText, normalizeUrl, deduplicateBy, parseDate } from "../research.utils.js";

const INDIA_TERMS = ["india", "indian", "anywhere in india", "remote - india", "remote (india)", "in"];

export function inferRemoteEligibility(text = "", scope = "both") {
    const normalized = cleanText(text).toLowerCase();
    const saysRemote = /\b(remote|work from home|distributed)\b/.test(normalized);
    const countryRestricted = /\b(remote only in|must be located in|based in|residents of|remote \([a-z ,]+\))\b/.test(normalized);
    const mentionsIndia = INDIA_TERMS.some((term) => normalized.includes(term));

    if (!saysRemote) {
        return { isRemote: false, eligibility: "not-remote", eligibleForSearch: false };
    }

    // Conservative classification: an explicit worldwide/anywhere statement is strongest.
    const worldwide = /\b(worldwide|work from anywhere|anywhere in the world|global remote|remote anywhere)\b/.test(normalized);
    let eligibility = "unclear";

    if (worldwide) eligibility = "worldwide";
    else if (mentionsIndia) eligibility = "india-eligible";
    else if (countryRestricted) eligibility = "country-restricted";

    const eligibleForSearch =
        scope === "both"
            ? ["worldwide", "india-eligible"].includes(eligibility)
            : scope === "india"
                ? ["worldwide", "india-eligible"].includes(eligibility)
                : eligibility === "worldwide";

    return { isRemote: true, eligibility, eligibleForSearch };
}

export function normalizeJob(raw) {
    const sourceUrl = normalizeUrl(raw.url || raw.sourceUrl || "");
    return {
        title: cleanText(raw.title || ""),
        company: cleanText(raw.company || ""),
        description: cleanText(raw.description || ""),
        experience: raw.experience || null,
        skills: Array.isArray(raw.skills) ? raw.skills : [],
        remoteType: raw.remoteType || "Remote (eligibility needs verification)",
        eligibleCountries: raw.eligibleCountries || [],
        salary: raw.salary || null,
        location: raw.location || null,
        postedDate: parseDate(raw.postedDate),
        applyUrl: normalizeUrl(raw.applyUrl || sourceUrl || ""),
        companyCareerUrl: normalizeUrl(raw.companyCareerUrl || ""),
        recruiterEmail: raw.recruiterEmail || null,
        sourceUrl,
    };
}

export function deduplicateJobs(jobs) {
    return deduplicateBy(jobs, (job) =>
        `${job.company.toLowerCase()}|${job.title.toLowerCase()}|${job.applyUrl || job.sourceUrl}`
    );
}
