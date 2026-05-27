/**
 * Resolve {@link X} and inline-code identifiers against a build-time symbol
 * index. The index aggregates: TypeDoc symbols (per subpath), authored Packages
 * MDX page slugs, Docs concept slugs, error codes. Scoring per spec §Connectivity.
 *
 * @param index - Pre-built symbol index keyed by token.
 * @param token - The raw token to resolve.
 * @param context - The current page's tab/package/subpath for scoring.
 * @returns Resolution result with target URL + ambiguity flag, or null if no match.
 */

export type SymbolIndex = Record<string, IndexEntry[]>;

export type IndexEntry = {
    url: string;
    kind: 'function' | 'class' | 'component' | 'type' | 'interface' | 'variable' | 'enum' | 'page' | 'error' | 'other';
    tab: 'docs' | 'packages' | 'reference' | 'errors';
    pkg?: string;
    subpath?: string;
};

export type ResolveContext = { tab: IndexEntry['tab']; pkg?: string; subpath?: string };

export type Resolution = {
    url: string;
    kind: IndexEntry['kind'];
    tab: IndexEntry['tab'];
    ambiguous: boolean;
};

const BLOCKLIST = new Set([
    'Error',
    'Promise',
    'Array',
    'Object',
    'string',
    'number',
    'boolean',
    'void',
    'null',
    'undefined',
    'Date',
    'Map',
    'Set',
    'function',
    'class',
    'return',
    'if',
    'else',
    'true',
    'false',
    'this',
    'new',
    'try',
    'catch',
    'async',
    'await',
    'const',
    'let',
    'var',
]);

/**
 * Determine whether a token is a candidate for symbol auto-linking. Rejects
 * keywords, builtins, and tokens that are too short or contain non-identifier
 * characters (hyphens, dots, slashes).
 *
 * @param token - Raw string from an inline-code node or {@link} reference.
 * @returns True when the token should be looked up in the symbol index.
 */
export function isLinkableToken(token: string): boolean {
    if (token.length < 3) return false;
    if (BLOCKLIST.has(token)) return false;
    return (
        /^[a-z][A-Za-z0-9]*$/.test(token) ||
        /^[A-Z][A-Za-z0-9]*$/.test(token) ||
        /^[A-Z][A-Z0-9_]*$/.test(token)
    );
}

/**
 * Resolve a token to its canonical documentation URL using the symbol index.
 * When multiple candidates exist, disambiguation is done by scoring against the
 * page's tab/package/subpath context. Returns null when no candidate is found.
 *
 * @param index - The pre-built symbol index.
 * @param token - Identifier to look up.
 * @param context - Context of the page performing the lookup.
 * @returns The best-match resolution, or null when not found.
 */
export function resolveLink(index: SymbolIndex, token: string, context: ResolveContext): Resolution | null {
    if (token.includes('/') || token.includes('.')) {
        return resolveExplicit(index, token);
    }
    const candidates = index[token] ?? [];
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return { ...candidates[0]!, ambiguous: false };
    const scored = candidates.map((c) => ({ c, score: scoreCandidate(c, token, context) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0]!;
    const second = scored[1]!;
    const winner = top.c;
    return {
        url: winner.url,
        kind: winner.kind,
        tab: winner.tab,
        ambiguous: top.score === second.score,
    };
}

/**
 * Score a candidate index entry against the current page context. Higher score
 * = stronger match. Subpath affinity scores highest (100) to keep reference
 * links within the same package subpath; same-package scores next (50).
 *
 * @param c - The candidate entry.
 * @param token - The token being resolved.
 * @param ctx - Current page context.
 * @returns Numeric score; higher wins.
 */
function scoreCandidate(c: IndexEntry, token: string, ctx: ResolveContext): number {
    let score = 0;
    if (c.subpath && c.subpath === ctx.subpath) score += 100;
    if (c.pkg && c.pkg === ctx.pkg) score += 50;
    if (c.tab === ctx.tab) score += 20;
    // Casing affinity: SCREAMING_SNAKE_CASE → errors tab
    if (/^[A-Z][A-Z0-9_]*$/.test(token) && c.tab === 'errors') score += 30;
    if (/^[a-z]/.test(token) && c.kind === 'function') score += 10;
    if (/^[A-Z]/.test(token) && (c.kind === 'class' || c.kind === 'component' || c.kind === 'type')) score += 10;
    return score;
}

/**
 * Resolve composite tokens (path/to/page or dotted slugs) by direct index
 * lookup on the full key, falling back to null when not found.
 *
 * @param index - The pre-built symbol index.
 * @param token - A composite token containing `/` or `.`.
 * @returns The first matching entry, or null.
 */
function resolveExplicit(index: SymbolIndex, token: string): Resolution | null {
    const direct = index[token];
    if (direct?.[0]) return { ...direct[0], ambiguous: false };
    return null;
}
