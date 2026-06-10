import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { MEDIA_MIME_TYPES } from './media';

/**
 * The Convex-side mirror of {@link MEDIA_MIME_TYPES}: `MEDIA_MIME_ALLOWLIST` in
 * `packages/convex/convex/cms/media.ts`, the list `finalizeUpload` enforces inside the Convex isolate.
 * It is a mirror rather than an import because this collections module is payload-coupled and off the
 * Convex bundle surface — and the Convex package's `tsc` program deliberately excludes node and payload
 * types, so the guard lives HERE (node-typed tests, real import of the source of truth) and reads the
 * mirror's source from disk.
 */
const CONVEX_MEDIA_SOURCE_PATH = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../convex/convex/cms/media.ts',
);

/**
 * Extracts the `MEDIA_MIME_ALLOWLIST` literal entries from the Convex `cms/media.ts` source. Matches
 * the exact `export const MEDIA_MIME_ALLOWLIST = […] as const;` declaration and pulls its
 * single-quoted string entries, failing CLOSED: a refactor that renames or restructures the
 * declaration makes this throw, so the guard can never silently pass against a stale extraction.
 *
 * @param source - The full Convex `cms/media.ts` source text.
 * @returns The declared mime-type entries, in declaration order.
 * @throws {TypeError} When the `MEDIA_MIME_ALLOWLIST` declaration cannot be located in `source`.
 */
function extractConvexMimeAllowlist(source: string): string[] {
    const declaration = source.match(/export const MEDIA_MIME_ALLOWLIST = \[([^\]]*)\] as const;/);
    const entries = declaration?.[1];
    if (entries === undefined) {
        throw new TypeError(
            'MEDIA_MIME_ALLOWLIST declaration not found in packages/convex/convex/cms/media.ts — update the drift guard extraction alongside the refactor.',
        );
    }
    return [...entries.matchAll(/'([^']+)'/g)].flatMap(([, entry]) => (entry === undefined ? [] : [entry]));
}

describe('media mime allowlist drift guard (BRIDGE-POLISH)', () => {
    it('keeps the Convex MEDIA_MIME_ALLOWLIST mirror byte-identical to MEDIA_MIME_TYPES', () => {
        const convexAllowlist = extractConvexMimeAllowlist(readFileSync(CONVEX_MEDIA_SOURCE_PATH, 'utf8'));

        // A vacuous extraction (empty list) must fail too — the guard only counts when it compares
        // real entries.
        expect(convexAllowlist.length).toBeGreaterThan(0);
        expect(convexAllowlist).toEqual([...MEDIA_MIME_TYPES]);
    });
});
