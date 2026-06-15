/**
 * Normalizes a URL path for comparison: lowercased, with any trailing slash removed except for the
 * bare root. `params`/query are assumed already stripped by the caller (App Router `usePathname`).
 *
 * @param path - The raw pathname (e.g. `/Shop/Settings/`).
 * @returns The normalized path (e.g. `/shop/settings`); the root collapses to `/`.
 */
export function normalizePath(path: string): string {
    const lower = path.toLowerCase();
    if (lower.length > 1 && lower.endsWith('/')) {
        return lower.slice(0, -1);
    }
    return lower;
}

/**
 * Tests whether `href` covers `pathname` at a segment boundary — true when the paths are equal or
 * `pathname` is a descendant route of `href`. Unlike a bare `startsWith`, `/shop/settings` does NOT
 * match `/shop/settings-billing`, because the match must land on a `/` boundary.
 *
 * This is the single-item (uncontrolled) test: an `href` that is a prefix of a sibling's `href`
 * (e.g. a section root) will report active for the sibling's routes too. Use {@link resolveActiveHref}
 * when sibling links overlap and only the most specific one should win.
 *
 * @param pathname - The current pathname.
 * @param href - The link target to test.
 * @returns `true` when `href` is active for `pathname`.
 */
export function isHrefActive(pathname: string, href: string): boolean {
    const path = normalizePath(pathname);
    const target = normalizePath(href);
    if (target === '/') return path === '/';
    return path === target || path.startsWith(`${target}/`);
}

/**
 * Picks the single active link among overlapping siblings: the longest `href` that covers `pathname`
 * at a segment boundary. This is what keeps a section root (`/shop/settings`) from lighting up
 * alongside its more specific sibling (`/shop/settings/users`) when you're on the latter — the
 * old prefix-only check highlighted both.
 *
 * @param pathname - The current pathname.
 * @param hrefs - The candidate link targets (rendered order is irrelevant).
 * @returns The winning href (verbatim as passed), or `null` when none cover `pathname`.
 */
export function resolveActiveHref(pathname: string, hrefs: readonly string[]): string | null {
    let best: string | null = null;
    let bestLength = -1;
    for (const href of hrefs) {
        if (!isHrefActive(pathname, href)) continue;
        const length = normalizePath(href).length;
        if (length > bestLength) {
            best = href;
            bestLength = length;
        }
    }
    return best;
}
