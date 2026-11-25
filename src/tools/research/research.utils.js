export function cleanText(value = "") {
    return String(value)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeUrl(value) {
    try {
        const url = new URL(value);
        url.hash = "";
        // Tracking parameters should not create duplicate records.
        for (const key of [...url.searchParams.keys()]) {
            if (/^(utm_|ref$|source$|gh_src$)/i.test(key)) url.searchParams.delete(key);
        }
        return url.toString().replace(/\/$/, "");
    } catch {
        return null;
    }
}

export function deduplicateBy(items, keyFn) {
    const seen = new Set();
    return items.filter((item) => {
        const key = keyFn(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isRecent(value, days = 30) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    const age = Date.now() - date.getTime();
    return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
}

export function truncate(value, maxLength = 12000) {
    const text = cleanText(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function getTodayFolderDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: process.env.TZ || "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
    return parts;
}
