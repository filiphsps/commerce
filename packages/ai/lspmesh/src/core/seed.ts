/** A path basename minus extension, lowercased and stripped to alphanumerics. */
export const normBase = (rel: string): string => {
    const base = rel
        .slice(rel.lastIndexOf('/') + 1)
        .replace(/\.[cm]?[jt]sx?$/, '')
        .replace(/\.d$/, '');
    return base.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

/** Seed priority for a repo-relative path; lower is opened first. */
export const seedScore = (rel: string, normQuery: string): number => {
    if (/(^|\/)dist\//.test(rel)) return 4;
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(rel) || /(^|\/)(e2e|__tests__|__mocks__)\//.test(rel)) return 3;
    if (/\.d\.ts$/.test(rel)) return 2;
    if (normQuery && normBase(rel) === normQuery) return -1;
    return 0;
};

/** Order seed files by priority (stable) and cap, reporting truncation. */
export const orderSeedFiles = (
    files: string[],
    query: string,
    cap = 60,
): { ordered: string[]; truncated: boolean; total: number } => {
    const normQuery = query.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const ordered = files
        .map((rel, i) => ({ rel, i }))
        .sort((a, b) => seedScore(a.rel, normQuery) - seedScore(b.rel, normQuery) || a.i - b.i)
        .slice(0, cap)
        .map(({ rel }) => rel);
    return { ordered, truncated: files.length > cap, total: files.length };
};
