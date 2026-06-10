import { getConvexSize, type Value } from 'convex/values';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MAX_SHREDDED_VALUE_BYTES, shredLocalizedFields } from '../../../convex/convex/cms/i18n_shred';
import {
    articleBySlugRef,
    createOperatorClient,
    createServerClient,
    importRows,
    type LimitsTenant,
    type LiveConvex,
    provisionTenant,
    saveRef,
    stableStringify,
    startLiveConvex,
} from './live';

/**
 * HARNESS-10 doc-size boundary suite — REAL local backend only. The convex-test JS mock enforces no
 * value-size ceilings, so the 1 MiB document limit and the shred round-trip that exists to dodge it
 * can only be proven here. Gated behind `CONVEX_LIMITS_TESTS=1` (boots a backend + one-shot deploy
 * per file, ~30-60s warm); the default `pnpm test` run never pays that cost.
 *
 * Timeout budget: 300s for the boot/deploy hook (a cold backend-binary fetch is governed by
 * `CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS`), 120s per test — generous over the ~5s observed
 * steady-state so a slow CI runner never flakes the suite.
 */
const limitsSuite = process.env.CONVEX_LIMITS_TESTS === '1' ? describe : describe.skip;

/** Every locale slot the shred-on-write call budget admits (`MAX_LOCALES_PER_SHRED_WRITE` = 8). */
const LOCALES = ['en-US', 'sv-SE', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'nl-NL', 'da-DK'] as const;

/** Paragraphs per locale body; sized so each locale serializes to ~200 KiB and the full bucket to ~1.6 MiB. */
const PARAGRAPHS_PER_LOCALE = 480;

/**
 * Builds one locale's deterministic ProseMirror body. Deterministic (no randomness, no timestamps)
 * so the golden byte-identity comparison is reproducible run to run.
 *
 * @param locale - The BCP-47 locale tag woven into every paragraph.
 * @returns A ProseMirror doc of {@link PARAGRAPHS_PER_LOCALE} text paragraphs.
 */
function buildLocaleBody(locale: string): Record<string, unknown> {
    const filler = 'lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor '.repeat(4);
    return {
        type: 'doc',
        content: Array.from({ length: PARAGRAPHS_PER_LOCALE }, (...[, index]) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: `[${locale}] paragraph ${index}: ${filler}` }],
        })),
    };
}

/**
 * Builds the max-locale rich-text article: the full 8-slot `body` bucket plus the inline required
 * fields a publish demands.
 *
 * @returns The serialized article data and its `body` bucket for per-locale golden comparison.
 */
function buildOversizeArticle(): { data: Record<string, unknown>; bucket: Record<string, unknown> } {
    const bucket = Object.fromEntries(LOCALES.map((locale) => [locale, buildLocaleBody(locale)]));
    return {
        data: { title: 'Limits Article', slug: 'limits-article', author: 'limits', body: bucket },
        bucket,
    };
}

limitsSuite('doc-size: ~1MiB max-locale rich-text doc shreds and reassembles (real backend)', () => {
    let live: LiveConvex;
    let tenant: LimitsTenant;

    beforeAll(async () => {
        live = await startLiveConvex();
        tenant = await provisionTenant(live);
    }, 300_000);

    afterAll(async () => {
        await live?.stop();
    }, 60_000);

    it('rejects the unshredded full-bucket document at the engine 1MiB value ceiling', async () => {
        const { data } = buildOversizeArticle();
        expect(JSON.stringify(data).length).toBeGreaterThan(1.25 * 1024 * 1024);

        // The whole point of the shred layer: this document CANNOT be stored inline. The real
        // engine (not the JS mock) enforces the ceiling, and the failed transaction rolls back.
        await expect(
            createOperatorClient(live).mutation(saveRef, { collection: 'articles', data, status: 'draft' }),
        ).rejects.toThrow(/too large/i);
    }, 120_000);

    it('seeds shredded (each side row < 1MiB) and reassembles every locale byte-identically', async () => {
        const { data, bucket } = buildOversizeArticle();

        const { inline, sideRows } = shredLocalizedFields('articles', data);
        expect(sideRows.map((row) => row.locale).sort()).toEqual([...LOCALES].sort());
        for (const row of sideRows) {
            const size = getConvexSize(row.value as Value);
            expect(size).toBeLessThan(MAX_SHREDDED_VALUE_BYTES);
            expect(size).toBeLessThan(1024 * 1024);
        }

        const saved = (await createOperatorClient(live).mutation(saveRef, {
            collection: 'articles',
            data: inline,
            status: 'published',
        })) as { documentId: string };

        const now = Date.now();
        importRows(
            live,
            'cms_i18n',
            sideRows.map((row) => ({
                parentId: saved.documentId,
                fieldPath: row.fieldPath,
                locale: row.locale,
                value: row.value,
                createdAt: now,
                updatedAt: now,
            })),
        );

        const server = createServerClient(live);
        for (const locale of LOCALES) {
            const article = (await server.query(articleBySlugRef, {
                serverSecret: live.serverSecret,
                shopId: tenant.publicShopId,
                slug: 'limits-article',
                locale,
            })) as Record<string, unknown> | null;

            expect(article).not.toBeNull();
            expect(article?.title).toBe('Limits Article');
            // Golden byte-identity per locale: the read path's reassembled body must serialize
            // (canonically, since Convex normalizes object key order) to the exact bytes shredded in.
            expect(stableStringify(article?.body)).toBe(stableStringify(bucket[locale]));
        }
    }, 120_000);
});
