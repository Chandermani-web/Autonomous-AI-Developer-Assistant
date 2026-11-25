export function buildJobSearchQueries(roles = ["MERN Developer", "Full-stack Developer"]) {
    const queries = [];
    for (const role of roles) {
        queries.push(`"${role}" remote worldwide jobs`);
        queries.push(`"${role}" remote India jobs`);
        queries.push(`"${role}" work from anywhere jobs`);
    }
    // YC's public remote jobs board is a useful discovery source, not a guarantee
    // that every listing accepts applicants from India.
    queries.push("site:ycombinator.com/jobs remote full stack developer");
    return [...new Set(queries)];
}

export const KNOWN_PUBLIC_JOB_SOURCES = [
    {
        name: "Y Combinator Work at a Startup",
        url: "https://www.ycombinator.com/jobs/role/all/remote",
        type: "public-job-board",
    },
];
