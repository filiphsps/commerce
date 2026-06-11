import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * SFREAD-11 — the lint-style boundary gate for the storefront's RSC-reachable Convex reads.
 *
 * The full seam inventory and the WHY for each boundary classification live in
 * `.specs/2026-05-30-convex-migration/sfread-11-rsc-convex-read-audit.md`. This suite pins the
 * structural invariants that audit depends on, so a new call site that would violate a boundary
 * (a `preloadQuery` baked into a `'use cache'` entry, a stray `ConvexHttpClient` outside the
 * `packages/db` seam, a clock read on the loader spine) fails CI instead of poisoning the
 * cacheComponents prerender.
 */

// `dirname` instead of `new URL('..', …)`: the happy-dom test environment installs its own `URL`
// global that rejects `file:` resolution.
const SRC_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Recursively collects every non-test TypeScript source file under `src/`, returned as
 * POSIX-style paths relative to the source root so allowlists stay platform-stable.
 *
 * @returns Sorted relative paths of every `.ts`/`.tsx` source file (tests and `.d.ts` excluded).
 */
function collectSourceFiles(): string[] {
    const files: string[] = [];
    const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const absolute = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(absolute);
                continue;
            }
            if (!/\.(?:ts|tsx)$/.test(entry.name)) continue;
            if (/\.test\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
            files.push(relative(SRC_ROOT, absolute).split(sep).join('/'));
        }
    };
    walk(SRC_ROOT);
    return files.sort();
}

/**
 * Reads a source file by its root-relative path.
 *
 * @param file - Path relative to the storefront `src/` root.
 * @returns The file's UTF-8 source text.
 */
function read(file: string): string {
    return readFileSync(join(SRC_ROOT, file), 'utf8');
}

/**
 * Whether a source file declares a `'use cache'` scope. Matches only the DIRECTIVE form (a line
 * holding nothing but the quoted directive), never prose mentions inside comments — several
 * modules document cache semantics in JSDoc without declaring a cached scope themselves.
 *
 * @param source - The file's source text.
 * @returns `true` when the file contains at least one `'use cache'` directive.
 */
function declaresUseCache(source: string): boolean {
    return /^\s*(['"])use cache(?:: [a-z]+)?\1;?\s*$/m.test(source);
}

const sourceFiles = collectSourceFiles();
const directiveFiles = sourceFiles.filter((file) => declaresUseCache(read(file)));

describe('SFREAD-11 — use cache / Convex transport boundary', () => {
    it('found the cached scopes (sanity: the scan sees the loader spine)', () => {
        expect(directiveFiles).toContain('app/[domain]/[locale]/layout.tsx');
        expect(directiveFiles).toContain('utils/request-context.ts');
        expect(directiveFiles.length).toBeGreaterThanOrEqual(20);
    });

    it("no 'use cache' scope imports a Convex transport module (preloadQuery/fetchQuery/ConvexHttpClient stay out of cached scopes)", () => {
        // Inside a cached scope, Convex is reachable ONLY through the audited seams — the
        // `@nordcom/commerce-db` server-trust services and the `_cms-read` loader — whose
        // reads become part of the cache entry. The `convex/nextjs` helpers are `no-store`
        // per-request reads (and `preloadQuery` carries a per-user token): inside `'use cache'`
        // they would bake one request's snapshot/token into a shared entry.
        const offenders = directiveFiles.filter((file) => /from\s+(['"])convex\/[a-z-]+\1/.test(read(file)));
        expect(offenders).toEqual([]);
    });

    it('confines convex/nextjs (preloadQuery) to the account dynamic-hole module', () => {
        // `preloadAccountProfile` documents (and account-profile.test.tsx proves) that this module
        // only runs after `await connection()` opened the dynamic PPR hole.
        const importers = sourceFiles.filter((file) => /from\s+(['"])convex\/nextjs\1/.test(read(file)));
        expect(importers).toEqual(['app/[domain]/[locale]/account/account-live-island.ts']);
    });

    it('keeps ConvexHttpClient construction out of the storefront (the packages/db seam owns it)', () => {
        const importers = sourceFiles.filter((file) => {
            const source = read(file);
            return /from\s+(['"])convex\/browser\1/.test(source) || /new ConvexHttpClient\(/.test(source);
        });
        expect(importers).toEqual([]);
    });

    it('confines the raw server-trust transport to the CMS read loader', () => {
        // Everything else goes through the typed `@nordcom/commerce-db` services so the audit's
        // seam inventory stays the complete list of RSC-reachable Convex reads.
        const importers = sourceFiles.filter((file) => /convexServer(?:Query|Mutation)/.test(read(file)));
        expect(importers).toEqual(['api/_cms-read.ts']);
    });

    it('reads no in-process clock on the Convex loader spine (cacheComponents clock guard)', () => {
        // The divergence ledger stamps times Convex-side; a `Date.now()`/`new Date()` in these
        // modules would run during cache creation of every cached page and is one config flip
        // (a future non-cached call site) away from tripping the prerender current-time guard.
        const spine = [
            'api/_cms-read.ts',
            'api/_loaders.ts',
            'api/_shop-loader.ts',
            'api/article.ts',
            'api/cms-blog.ts',
            'api/footer.ts',
            'api/header.ts',
            'api/info-bar.ts',
            'api/metadata.ts',
            'api/page.ts',
            'api/store.ts',
        ];
        const offenders = spine.filter((file) => /Date\.now\(|new Date\(/.test(read(file)));
        expect(offenders).toEqual([]);
    });

    it('keeps the account preloadQuery behind the connection() gate', () => {
        const page = read('app/[domain]/[locale]/account/page.tsx');
        const session = page.slice(page.indexOf('async function AccountSession'));
        const connectionAt = session.indexOf('await connection()');
        const profileAt = session.indexOf('<AccountProfile');
        expect(connectionAt).toBeGreaterThan(-1);
        expect(profileAt).toBeGreaterThan(connectionAt);
        // And the island module itself must never grow a cached scope around its per-user read.
        expect(declaresUseCache(read('app/[domain]/[locale]/account/account-live-island.ts'))).toBe(false);
    });
});
