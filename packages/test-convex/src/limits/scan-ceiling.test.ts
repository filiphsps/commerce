import { ConvexError } from 'convex/values';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SCAN_BYTE_BUDGET, SCAN_DOCUMENT_BUDGET, ScanBudgetErrorCode } from '../../../convex/convex/lib/scan_budget';
import {
    createOperatorClient,
    importRows,
    type LimitsTenant,
    type LiveConvex,
    listRef,
    provisionTenant,
    startLiveConvex,
} from './live';

/**
 * HARNESS-10 scan-ceiling boundary suite — REAL local backend only. Proves that a tenant list pushed
 * past the documented scan budget (`lib/scan_budget.ts`: 32 768 documents / 16 MiB approximate bytes)
 * surfaces the TYPED `BoundedScanExceededError` (`CMS_BOUNDED_SCAN_EXCEEDED`) through the wire — never a leaked engine abort
 * and never a silently truncated page. Gated behind `CONVEX_LIMITS_TESTS=1`; timeout budget mirrors
 * `doc-size.test.ts` (300s boot hook, 120s per test).
 *
 * SEEDING STRATEGY (why ~20 docs, not 32 768): rows are bulk-inserted in ONE `convex import` JSONL
 * batch ({@link importRows}) to keep runtime in seconds. The targeted boundary is the BYTE budget,
 * because it is the only ceiling reachable as a typed error through the real engine:
 * - The DOCUMENT budget (32 768) is exactly the engine's own per-execution read ceiling, and a tenant
 *   query reads a handful of auth/RLS preamble rows (`users`, `shopCollaborators`) before the scan —
 *   so the engine's untyped abort would always fire one pull before the guard could.
 * - The BYTE budget is tripped early-by-design: the guard accumulates `JSON.stringify` length, which
 *   over-counts escaped characters. A `"` filler serializes at 2 JSON chars per stored byte, so the
 *   guard's 16 MiB JSON-length ceiling trips while the engine has physically read only ~8.5 MiB —
 *   well inside its own 16 MiB abort. 20 docs x ~0.5 MiB stored (~1 MiB JSON each) put the boundary
 *   at document ~17, verified against the real backend.
 */
const limitsSuite = process.env.CONVEX_LIMITS_TESTS === '1' ? describe : describe.skip;

/** Stored bytes of escaping filler per row (~0.5 MiB stored, ~1 MiB as JSON — under the 1 MiB row cap). */
const FILLER_LENGTH = 500_000;

/** Rows seeded past the boundary: 20 x ~1 MiB JSON ≈ 20 MiB counted, past the 16 MiB byte budget. */
const SEED_ROWS = 20;

limitsSuite('scan-ceiling: over-budget tenant list fails typed (real backend)', () => {
    let live: LiveConvex;
    let tenant: LimitsTenant;

    beforeAll(async () => {
        live = await startLiveConvex();
        tenant = await provisionTenant(live);
    }, 300_000);

    afterAll(async () => {
        await live?.stop();
    }, 60_000);

    it('serves an in-budget collection normally (control: the path is not just always-throwing)', async () => {
        const now = Date.now();
        importRows(
            live,
            'cmsDocuments',
            Array.from({ length: 3 }, (...[, index]) => ({
                shopId: tenant.shopDocId,
                collection: 'limits-scan-control',
                data: { index },
                status: 'published',
                createdAt: now,
                updatedAt: now,
            })),
        );

        const page = (await createOperatorClient(live).query(listRef, {
            collection: 'limits-scan-control',
        })) as { totalDocs: number; docs: unknown[]; isDone: boolean };
        expect(page.totalDocs).toBe(3);
        expect(page.docs).toHaveLength(3);
        expect(page.isDone).toBe(true);
    }, 120_000);

    it('throws the typed BoundedScanExceededError at the byte-budget boundary, not a silent truncation', async () => {
        const now = Date.now();
        importRows(
            live,
            'cmsDocuments',
            Array.from({ length: SEED_ROWS }, (...[, index]) => ({
                shopId: tenant.shopDocId,
                collection: 'limits-scan',
                data: { index, filler: '"'.repeat(FILLER_LENGTH) },
                status: 'published',
                createdAt: now,
                updatedAt: now,
            })),
        );

        let thrown: unknown;
        try {
            await createOperatorClient(live).query(listRef, { collection: 'limits-scan' });
        } catch (err) {
            thrown = err;
        }

        // The guard MUST abort the scan: an undefined `thrown` here would mean the list silently
        // served a truncated (or impossibly complete) window past the documented budget.
        expect(thrown).toBeInstanceOf(ConvexError);
        const data = (thrown as ConvexError<Record<string, unknown>>).data;
        expect(data.code).toBe(ScanBudgetErrorCode.BOUNDED_SCAN_EXCEEDED);
        expect(data.byteBudget).toBe(SCAN_BYTE_BUDGET);
        expect(data.documentBudget).toBe(SCAN_DOCUMENT_BUDGET);
        expect(data.bytes as number).toBeGreaterThanOrEqual(SCAN_BYTE_BUDGET);
        expect(data.scanned as number).toBeGreaterThan(0);
        expect(data.scanned as number).toBeLessThanOrEqual(SEED_ROWS);
        console.info(
            `[scan-ceiling] typed abort at scanned=${data.scanned} bytes=${data.bytes} ` +
                `(byteBudget=${data.byteBudget}, documentBudget=${data.documentBudget})`,
        );
    }, 120_000);
});
