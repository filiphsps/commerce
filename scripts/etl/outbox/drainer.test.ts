/**
 * PIPELINE-05 drain-half proof over the pure cores: total-order parsing, upsert/delete folding
 * keyed by the source `_id` through the SAME id-remap as the ETL, append-once version identity,
 * suffix-replay and killed-mid-batch convergence (the at-least-once contract), drain-lag
 * computation, and the post-drain PIPELINE-04 parity hook. The live `mongoexport`/`convex import`
 * shelling is the same thin-runner deferral as `../export.ts`/`../import.ts` — the staged bytes
 * proven here are exactly what those runners ship.
 */
import { describe, expect, it } from 'vitest';

import { buildConvexImportArgs } from '../import';
import { expectedChecksums } from '../reconcile/checksum';
import { type Doc, remapObjectId } from '../transform/id-remap';
import type { SourceDataset } from '../transform/index';
import {
    computeDrainLag,
    type DrainPlan,
    type FreezeSnapshot,
    foldOutbox,
    outboxToken,
    parseDrainCursor,
    parseOutboxEntries,
    planDrain,
    routeOutboxCollection,
    serializeRows,
} from './drainer';

const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e1';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f1';
const PAGE_ID = '6630f1a2b3c4d5e6f7a8b9c0';
const NEW_PAGE_ID = '6630f1a2b3c4d5e6f7a8b9c1';
const VERSION_ID = '6630f1a2b3c4d5e6f7a8b9a0';

/** The frozen core snapshot in mongoexport extended JSON — the PIPELINE-01 export shape. */
const coreSnapshot = (): SourceDataset => ({
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Frozen Shop',
            domain: 'frozen.example.com',
            featureFlags: [{ flag: { $oid: FLAG_ID } }],
            createdAt: { $date: '2026-05-01T00:00:00.000Z' },
            updatedAt: { $date: '2026-05-01T00:00:00.000Z' },
        },
    ],
    featureFlags: [
        {
            _id: { $oid: FLAG_ID },
            key: 'frozen-flag',
            defaultValue: false,
            targeting: [],
            createdAt: { $date: '2026-05-01T00:00:00.000Z' },
            updatedAt: { $date: '2026-05-01T00:00:00.000Z' },
        },
    ],
    reviews: [
        {
            _id: { $oid: REVIEW_ID },
            shop: { $oid: SHOP_ID },
            createdAt: { $date: '2026-05-02T00:00:00.000Z' },
            updatedAt: { $date: '2026-05-02T00:00:00.000Z' },
        },
    ],
});

/** The frozen snapshot incl. one CMS collection and its versions companion. */
const snapshot = (): FreezeSnapshot => ({
    core: coreSnapshot(),
    cms: {
        pages: [
            {
                _id: { $oid: PAGE_ID },
                tenant: { $oid: SHOP_ID },
                title: 'Home',
                slug: 'home',
                _status: 'published',
                createdAt: { $date: '2026-05-03T00:00:00.000Z' },
                updatedAt: { $date: '2026-05-03T00:00:00.000Z' },
            },
        ],
    },
    versions: { pages: [] },
});

/**
 * Builds one raw outbox row in the shape `appendOutboxEntry` persists (post-mongoexport).
 *
 * @param id - The outbox row's own `_id` (the order tiebreak).
 * @param collection - The captured collection.
 * @param operation - The write shape.
 * @param legacyId - The captured row's `_id` hex.
 * @param doc - The full post-write snapshot, or `null` for a delete.
 * @param ts - Capture timestamp.
 * @returns The raw outbox row.
 */
const rawEntry = (
    id: string,
    collection: string,
    operation: 'upsert' | 'delete',
    legacyId: string,
    doc: Doc | null,
    ts: number,
): Doc => ({ _id: id, collection, operation, legacyId, doc, ts });

/** The freeze-window write sequence the suite replays: edit, create, autosave x2, delete. */
const outboxRaws = (): Doc[] => [
    rawEntry(
        'ob1',
        'shops',
        'upsert',
        SHOP_ID,
        {
            _id: { $oid: SHOP_ID },
            name: 'Renamed During Freeze',
            domain: 'frozen.example.com',
            featureFlags: [{ flag: { $oid: FLAG_ID } }],
            createdAt: { $date: '2026-05-01T00:00:00.000Z' },
            updatedAt: { $date: '2026-06-09T00:00:01.000Z' },
        },
        1000,
    ),
    rawEntry(
        'ob2',
        'pages',
        'upsert',
        NEW_PAGE_ID,
        {
            _id: { $oid: NEW_PAGE_ID },
            tenant: { $oid: SHOP_ID },
            title: 'Freeze Page',
            slug: 'freeze',
            _status: 'draft',
            createdAt: { $date: '2026-06-09T00:00:02.000Z' },
            updatedAt: { $date: '2026-06-09T00:00:02.000Z' },
        },
        2000,
    ),
    rawEntry(
        'ob3',
        '_pages_versions',
        'upsert',
        VERSION_ID,
        {
            _id: { $oid: VERSION_ID },
            parent: { $oid: NEW_PAGE_ID },
            version: { tenant: { $oid: SHOP_ID }, title: 'Freeze Page', slug: 'freeze', _status: 'draft' },
            latest: true,
            createdAt: { $date: '2026-06-09T00:00:02.000Z' },
            updatedAt: { $date: '2026-06-09T00:00:02.000Z' },
        },
        3000,
    ),
    // The 2s-autosave moving target: the SAME version row captured again with newer content.
    rawEntry(
        'ob4',
        '_pages_versions',
        'upsert',
        VERSION_ID,
        {
            _id: { $oid: VERSION_ID },
            parent: { $oid: NEW_PAGE_ID },
            version: { tenant: { $oid: SHOP_ID }, title: 'Freeze Page v2', slug: 'freeze', _status: 'draft' },
            latest: true,
            createdAt: { $date: '2026-06-09T00:00:02.000Z' },
            updatedAt: { $date: '2026-06-09T00:00:04.000Z' },
        },
        4000,
    ),
    rawEntry('ob5', 'reviews', 'delete', REVIEW_ID, null, 5000),
];

/**
 * Serializes every staged table of a plan — the exact bytes the runner hands `convex import`.
 *
 * @param plan - The drain plan.
 * @returns Table name → staged JSONL bytes.
 */
const stagedBytes = (plan: DrainPlan): Record<string, string> =>
    Object.fromEntries(Object.entries(plan.tables).map(([table, rows]) => [table, serializeRows(rows)]));

describe('parseOutboxEntries', () => {
    it('orders entries by (ts, _id) and validates the shape', () => {
        const shuffled = [...outboxRaws()].reverse();
        const { entries, malformed } = parseOutboxEntries(shuffled);
        expect(malformed).toBe(0);
        expect(entries.map((entry) => entry.ts)).toEqual([1000, 2000, 3000, 4000, 5000]);
        expect(entries[0]?.token).toBe(outboxToken(1000, 'ob1'));
    });

    it('counts malformed rows instead of silently dropping them', () => {
        const { entries, malformed } = parseOutboxEntries([
            rawEntry('ok', 'shops', 'delete', SHOP_ID, null, 1),
            { collection: 'shops', operation: 'upsert', legacyId: SHOP_ID, doc: null, ts: 2 },
            { collection: 'shops', operation: 'rename', legacyId: SHOP_ID, doc: {}, ts: 3 },
            { operation: 'delete', legacyId: SHOP_ID, doc: null, ts: 4 },
        ]);
        expect(entries).toHaveLength(1);
        expect(malformed).toBe(3);
    });
});

describe('routeOutboxCollection', () => {
    it('classifies core, cms, versions, and pipeline-internal names', () => {
        expect(routeOutboxCollection('shops')).toEqual({ kind: 'core', collection: 'shops' });
        expect(routeOutboxCollection('pages')).toEqual({ kind: 'cms', slug: 'pages' });
        expect(routeOutboxCollection('_pages_versions')).toEqual({ kind: 'versions', slug: 'pages' });
        expect(routeOutboxCollection('_convex_outbox')).toEqual({ kind: 'skip' });
    });
});

describe('foldOutbox + planDrain (idempotent upsert through the ETL id-remap)', () => {
    it('an upserted row lands on the SAME surrogate payloadId as its frozen ancestor', () => {
        const { entries } = parseOutboxEntries(outboxRaws());
        const before = planDrain(foldOutbox(snapshot(), []));
        const after = planDrain(foldOutbox(snapshot(), entries));

        const shopBefore = before.tables.shops?.find((row) => row.document.legacyId === SHOP_ID);
        const shopAfter = after.tables.shops?.find((row) => row.document.legacyId === SHOP_ID);
        expect(shopBefore?.document.name).toBe('Frozen Shop');
        expect(shopAfter?.document.name).toBe('Renamed During Freeze');
        expect(shopAfter?.payloadId).toBe(shopBefore?.payloadId);
        expect(shopAfter?.payloadId).toBe(remapObjectId('shops', SHOP_ID));
        expect(after.tables.shops).toHaveLength(1);
    });

    it('folds creates, deletes, and version autosaves (append-once by derived version identity)', () => {
        const { entries } = parseOutboxEntries(outboxRaws());
        const plan = planDrain(foldOutbox(snapshot(), entries));

        expect(plan.tables.reviews).toHaveLength(0);
        expect(plan.tables.cmsDocuments?.map((row) => row.payloadId).sort()).toEqual(
            [remapObjectId('cmsDocuments', PAGE_ID), remapObjectId('cmsDocuments', NEW_PAGE_ID)].sort(),
        );

        // Two captures of the SAME version _id stage exactly ONE row, holding the newer snapshot,
        // and the parent's latest-version pointer resolves to that derived identity.
        const versions = plan.tables.cmsVersions ?? [];
        expect(versions).toHaveLength(1);
        expect(versions[0]?.payloadId).toBe(remapObjectId('cmsVersions', VERSION_ID));
        expect((versions[0]?.document.snapshot as Doc).title).toBe('Freeze Page v2');
        const newPage = plan.tables.cmsDocuments?.find(
            (row) => row.payloadId === remapObjectId('cmsDocuments', NEW_PAGE_ID),
        );
        expect(newPage?.document.latestVersionId).toBe(remapObjectId('cmsVersions', VERSION_ID));

        expect(plan.divergences).toEqual([]);
        expect(plan.duplicatePayloadIds).toEqual({});
    });

    it('replaying the whole outbox, or any suffix, stages byte-identical tables (no duplicates)', () => {
        const { entries } = parseOutboxEntries(outboxRaws());
        const oracle = stagedBytes(planDrain(foldOutbox(snapshot(), entries)));

        for (const split of [0, 1, 3, entries.length]) {
            const prefix = entries.slice(0, split);
            // At-least-once: the suffix overlaps the prefix (replay from the start), as a crashed
            // drainer that never advanced its cursor would re-apply.
            for (const replayFrom of [0, Math.max(0, split - 1), split]) {
                const refolded = foldOutbox(foldOutbox(snapshot(), prefix), entries.slice(replayFrom));
                expect(stagedBytes(planDrain(refolded))).toEqual(oracle);
            }
        }
    });

    it('chaos: a drainer killed mid-batch re-runs from the immutable snapshot to the converged state', () => {
        const { entries } = parseOutboxEntries(outboxRaws());
        // Crash simulation: only 2 of 5 entries were folded and (partially) imported before the
        // kill, and the cursor was NOT advanced (it only moves after a fully successful apply).
        const partial = stagedBytes(planDrain(foldOutbox(snapshot(), entries.slice(0, 2))));
        const full = stagedBytes(planDrain(foldOutbox(snapshot(), entries)));
        expect(partial).not.toEqual(full);

        // The re-run folds the WHOLE outbox over the unchanged frozen snapshot — its staged bytes
        // are the converged oracle regardless of which tables the killed run already replaced…
        const rerun = stagedBytes(planDrain(foldOutbox(snapshot(), entries)));
        expect(rerun).toEqual(full);

        // …because every staged table is FULL-corpus and applied with `--replace`, the partially
        // applied tables are swapped wholesale rather than merged into duplicates.
        expect(buildConvexImportArgs('cmsDocuments', '/tmp/cmsDocuments.jsonl')).toContain('--replace');
    });
});

describe('computeDrainLag', () => {
    it('reports the undrained window relative to the cursor', () => {
        const { entries } = parseOutboxEntries(outboxRaws());
        const fresh = computeDrainLag(entries, null, 10_000);
        expect(fresh).toEqual({ undrainedCount: 5, oldestUndrainedTs: 1000, latestUndrainedTs: 5000, lagMs: 9000 });

        const mid = computeDrainLag(entries, outboxToken(3000, 'ob3'), 10_000);
        expect(mid).toEqual({ undrainedCount: 2, oldestUndrainedTs: 4000, latestUndrainedTs: 5000, lagMs: 6000 });

        const drained = computeDrainLag(entries, outboxToken(5000, 'ob5'), 10_000);
        expect(drained).toEqual({ undrainedCount: 0, oldestUndrainedTs: null, latestUndrainedTs: null, lagMs: 0 });
    });
});

describe('parseDrainCursor', () => {
    it('round-trips a persisted cursor and resets on absence or corruption', () => {
        expect(parseDrainCursor('{"token":"t","drainedAt":5,"appliedEntries":3}')).toEqual({
            token: 't',
            drainedAt: 5,
            appliedEntries: 3,
        });
        expect(parseDrainCursor(null)).toEqual({ token: null, drainedAt: null, appliedEntries: 0 });
        expect(parseDrainCursor('not json')).toEqual({ token: null, drainedAt: null, appliedEntries: 0 });
    });
});

describe('post-drain reconciliation hook (PIPELINE-04 parity over the folded corpus)', () => {
    it('the folded corpus checksums identically to a from-scratch export of the post-write state', async () => {
        const { entries } = parseOutboxEntries(outboxRaws());
        const folded = foldOutbox(snapshot(), entries);
        const viaDrain = await expectedChecksums(folded.core, folded.cms);

        // The independent oracle: build the post-freeze source corpus directly, as a fresh
        // mongoexport of the final Mongo state would produce it.
        const direct: FreezeSnapshot = {
            core: {
                shops: [
                    {
                        _id: { $oid: SHOP_ID },
                        name: 'Renamed During Freeze',
                        domain: 'frozen.example.com',
                        featureFlags: [{ flag: { $oid: FLAG_ID } }],
                        createdAt: { $date: '2026-05-01T00:00:00.000Z' },
                        updatedAt: { $date: '2026-06-09T00:00:01.000Z' },
                    },
                ],
                featureFlags: coreSnapshot().featureFlags,
                reviews: [],
            },
            cms: {
                pages: [
                    ...(snapshot().cms.pages ?? []),
                    {
                        _id: { $oid: NEW_PAGE_ID },
                        tenant: { $oid: SHOP_ID },
                        title: 'Freeze Page',
                        slug: 'freeze',
                        _status: 'draft',
                        createdAt: { $date: '2026-06-09T00:00:02.000Z' },
                        updatedAt: { $date: '2026-06-09T00:00:02.000Z' },
                    },
                ],
            },
            versions: {},
        };
        const viaFreshExport = await expectedChecksums(direct.core, direct.cms);
        expect(viaDrain).toEqual(viaFreshExport);
    });
});
