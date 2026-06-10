#!/usr/bin/env tsx
/**
 * PIPELINE-05 freeze-window write capture, drain half: an idempotent, at-least-once applier that
 * replays the transactional outbox (`./append.ts`) into the frozen-snapshot Convex import.
 *
 * Design — replay-the-whole-outbox over the immutable frozen snapshot:
 * 1. The frozen mongoexport snapshot under the staging dir NEVER changes after the freeze export.
 * 2. Every drain folds the ENTIRE outbox (in capture order) onto that snapshot — an upsert keyed by
 *    the source row's `_id` hex (`legacyId`), which the REAL PIPELINE-01/02 transforms then remap
 *    through the SAME deterministic id derivation the initial import used, so a re-drained row
 *    lands on the SAME surrogate `payloadId` instead of duplicating. Versions fold the same way:
 *    `transformCmsVersions` derives the version identity from the version row's own `_id`
 *    (append-once; a superseding autosave snapshot with a newer `updatedAt` replaces, never
 *    duplicates).
 * 3. The folded corpus is staged FULL-TABLE and applied through the ETL's own
 *    `convex import --table --replace` path (`../import.ts`), which swaps each table's contents
 *    wholesale. Replaying the whole outbox — or any suffix, or a re-run after a mid-batch kill —
 *    therefore converges to the identical Convex state: idempotence is structural, not protocol.
 *    (Full-table staging is also a correctness requirement, not just simplicity: `cmsDocuments`
 *    holds rows from EVERY collection slug, so a partial per-slug `--replace` would wipe the
 *    others.)
 * 4. The drain cursor (`outbox-cursor.json`) is at-least-once BOOKKEEPING only — it records what
 *    has been applied so lag is measurable, and it advances only AFTER a successful `--execute`
 *    apply. A crash anywhere re-runs from scratch and converges (`drainer.test.ts` chaos suite).
 * 5. Exit wires into the PIPELINE-04 parity gate: every drain recomputes the expected-side
 *    checksums for the FOLDED corpus (`../reconcile/checksum.ts`) into
 *    `<staging>/convex/reconcile-expected.json`; the flip is forbidden until
 *    `convex/reconcile.ts:run` is green against that file (see `./runbook.md`).
 *
 * Usage:
 *   tsx scripts/etl/outbox/drainer.ts             # dry: fold + stage + lag report (no Convex writes, cursor untouched)
 *   tsx scripts/etl/outbox/drainer.ts --execute   # mongoexport the outbox, apply per-table `convex import`, advance cursor
 *
 * DEFERRED (live I/O): `--execute` shells `mongoexport` + the `convex` CLI, neither available in the
 * migration sandbox — the same deferral as `../export.ts`/`../import.ts`. The fold/plan/lag cores
 * are pure and fully unit-proven.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildMongoexportArgs, resolveStagingDir, SOURCE_COLLECTIONS, type SourceCollection } from '../export';
import { buildConvexImportArgs, parseJsonl } from '../import';
import { expectedChecksums } from '../reconcile/checksum';
import { coerceObjectId, type Doc } from '../transform/id-remap';
import { normalizeExtendedJson, type SourceDataset, transform, type TransformedDoc } from '../transform/index';
import { type CmsTransformDivergence, sortStagedRows, transformCmsDocuments } from '../transform/shred-richtext';
import { applyLatestVersionPointers, transformCmsVersions } from '../transform/versions';
import { OUTBOX_COLLECTION, type OutboxEntry } from './append';

/** File (under the staging dir) recording the at-least-once drain cursor. */
export const OUTBOX_CURSOR_FILE = 'outbox-cursor.json';

/** File (under `<staging>/convex/`) the post-drain PIPELINE-04 parity gate reads its expected side from. */
export const RECONCILE_EXPECTED_FILE = 'reconcile-expected.json';

/**
 * The immutable frozen corpus the drain folds into: the core PIPELINE-01 collections, the CMS
 * collections by slug, and their `_<slug>_versions` companions by slug.
 */
export interface FreezeSnapshot {
    core: SourceDataset;
    cms: Record<string, Doc[]>;
    versions: Record<string, Doc[]>;
}

/**
 * One parsed outbox entry plus its total-order `token` — capture timestamp (zero-padded so the
 * lexicographic order is the numeric order) tie-broken by the outbox row's own `_id` hex. Two
 * captures of the same row in the same millisecond from different sessions order by `_id`; because
 * every entry carries FULL post-write state, a wrong tiebreak within that 1ms window is the only
 * reordering exposure, and it is bounded to writes the freeze's single admin writer raced against
 * itself (see the runbook's failure-window inventory).
 */
export interface ParsedOutboxEntry extends OutboxEntry {
    token: string;
}

/** The result of parsing a raw outbox export: ordered entries plus the malformed-line count. */
export interface ParsedOutbox {
    entries: ParsedOutboxEntry[];
    /** Rows that failed validation. ANY malformed row is a lost capture — the drain must refuse to certify. */
    malformed: number;
}

/**
 * Builds the total-order token for one outbox row. Exported for the tests' synthetic entries.
 *
 * @param ts - The entry's capture timestamp (epoch ms).
 * @param tiebreak - The outbox row's `_id` hex (or a deterministic fallback).
 * @returns A lexicographically ordered token.
 */
export const outboxToken = (ts: number, tiebreak: string): string =>
    `${String(Math.max(0, Math.trunc(ts))).padStart(15, '0')}:${tiebreak}`;

/**
 * Parses raw outbox rows (mongoexport extended JSON) into validated, total-ordered entries.
 * Malformed rows are counted, never silently dropped: the runner treats `malformed > 0` as a hard
 * failure because a row {@link appendOutboxEntry} wrote can only be malformed if the outbox was
 * tampered with or the export was truncated — either way a captured write may be lost. Pure.
 *
 * @param raws - The outbox rows as exported/inserted.
 * @returns The ordered entries plus the malformed count.
 */
export const parseOutboxEntries = (raws: readonly Doc[]): ParsedOutbox => {
    const entries: ParsedOutboxEntry[] = [];
    let malformed = 0;
    for (const [index, raw] of raws.entries()) {
        const doc = normalizeExtendedJson(raw) as Doc;
        const collection = typeof doc.collection === 'string' ? doc.collection : null;
        const operation = doc.operation === 'upsert' || doc.operation === 'delete' ? doc.operation : null;
        const legacyId = typeof doc.legacyId === 'string' && doc.legacyId.length > 0 ? doc.legacyId : null;
        const ts = typeof doc.ts === 'number' && Number.isFinite(doc.ts) ? doc.ts : null;
        const snapshot = doc.doc && typeof doc.doc === 'object' && !Array.isArray(doc.doc) ? (doc.doc as Doc) : null;
        if (!collection || !operation || !legacyId || ts === null || (operation === 'upsert' && !snapshot)) {
            malformed += 1;
            continue;
        }
        const tiebreak = coerceObjectId(doc._id) ?? `line-${String(index).padStart(9, '0')}`;
        entries.push({
            collection,
            operation,
            legacyId,
            doc: operation === 'upsert' ? snapshot : null,
            ts,
            token: outboxToken(ts, tiebreak),
        });
    }
    entries.sort((left, right) => (left.token < right.token ? -1 : left.token > right.token ? 1 : 0));
    return { entries, malformed };
};

/** Where one source-collection name routes inside the {@link FreezeSnapshot}. */
export type OutboxRoute =
    | { kind: 'core'; collection: SourceCollection }
    | { kind: 'cms'; slug: string }
    | { kind: 'versions'; slug: string }
    | { kind: 'skip' };

/**
 * Classifies a source collection name: a PIPELINE-01 core collection, a `_<slug>_versions`
 * companion, a CMS collection slug, or pipeline-internal (any other underscore-prefixed name,
 * including the outbox itself) — the same classification `readFreezeSnapshot` applies to staged
 * files. Pure.
 *
 * @param name - The Mongo collection name.
 * @returns The route.
 */
export const routeOutboxCollection = (name: string): OutboxRoute => {
    if ((SOURCE_COLLECTIONS as readonly string[]).includes(name)) {
        return { kind: 'core', collection: name as SourceCollection };
    }
    const versions = /^_(.+)_versions$/.exec(name);
    const slug = versions?.[1];
    if (slug !== undefined) return { kind: 'versions', slug };
    if (name.startsWith('_')) return { kind: 'skip' };
    return { kind: 'cms', slug: name };
};

/**
 * Folds one collection's entries onto its snapshot rows: an upsert replaces (or appends) the row
 * with the same source `_id`, a delete removes it. Entries must already be in token order. Pure —
 * returns a fresh array.
 *
 * @param rows - The collection's frozen-snapshot rows.
 * @param entries - The collection's outbox entries, token-ordered.
 * @returns The folded rows.
 */
const foldCollection = (rows: readonly Doc[], entries: readonly ParsedOutboxEntry[]): Doc[] => {
    const byId = new Map<string, Doc>();
    let synthetic = 0;
    for (const row of rows) {
        const id = coerceObjectId(row._id) ?? `snapshot-unkeyed-${synthetic++}`;
        byId.set(id, row);
    }
    for (const entry of entries) {
        if (entry.operation === 'delete') {
            byId.delete(entry.legacyId);
        } else if (entry.doc) {
            byId.set(entry.legacyId, entry.doc);
        }
    }
    return [...byId.values()];
};

/**
 * Folds the whole outbox onto the frozen snapshot: the pure upsert/delete replay keyed by source
 * `_id`, routed per collection. Because every entry carries full post-write state and replays in
 * total order, folding is idempotent and suffix-tolerant — `fold(fold(s, prefix), suffix)` equals
 * `fold(s, all)` for any split, which is what makes a killed-and-rerun drain converge. Pure.
 *
 * @param snapshot - The immutable frozen corpus.
 * @param entries - ALL outbox entries, token-ordered (from {@link parseOutboxEntries}).
 * @returns A fresh folded snapshot.
 */
export const foldOutbox = (snapshot: FreezeSnapshot, entries: readonly ParsedOutboxEntry[]): FreezeSnapshot => {
    const byTarget = new Map<string, ParsedOutboxEntry[]>();
    for (const entry of entries) {
        const bucket = byTarget.get(entry.collection) ?? [];
        bucket.push(entry);
        byTarget.set(entry.collection, bucket);
    }

    const core: SourceDataset = { ...snapshot.core };
    const cms: Record<string, Doc[]> = { ...snapshot.cms };
    const versions: Record<string, Doc[]> = { ...snapshot.versions };

    for (const [name, bucket] of byTarget) {
        const route = routeOutboxCollection(name);
        if (route.kind === 'core') {
            core[route.collection] = foldCollection(core[route.collection] ?? [], bucket);
        } else if (route.kind === 'cms') {
            cms[route.slug] = foldCollection(cms[route.slug] ?? [], bucket);
        } else if (route.kind === 'versions') {
            versions[route.slug] = foldCollection(versions[route.slug] ?? [], bucket);
        }
    }
    return { core, cms, versions };
};

/**
 * The staged result of one drain: every destination Convex table's FULL row set for the folded
 * corpus, plus the blocking defect reports. `divergences` are freeze-window writes whose rich text
 * could not convert; `duplicatePayloadIds` would mean two source rows derived the same surrogate id
 * (an id-remap invariant breach). Either is a hard no-go for the flip.
 */
export interface DrainPlan {
    tables: Record<string, TransformedDoc[]>;
    divergences: CmsTransformDivergence[];
    duplicatePayloadIds: Record<string, string[]>;
}

/**
 * Runs the folded corpus through the REAL PIPELINE-01/02 transforms into full-table staged rows —
 * the exact modules the initial import used, so a drained row derives the SAME surrogate
 * `payloadId` as its frozen-snapshot ancestor (the upsert key) and version rows derive the same
 * append-once identity. Pure and deterministic: same folded corpus, byte-identical plan.
 *
 * @param folded - The folded corpus from {@link foldOutbox}.
 * @returns The drain plan.
 */
export const planDrain = (folded: FreezeSnapshot): DrainPlan => {
    const divergences: CmsTransformDivergence[] = [];
    const coreDataset = transform(folded.core);

    const cmsDocuments: TransformedDoc[] = [];
    const cmsI18n: TransformedDoc[] = [];
    const cmsVersions: TransformedDoc[] = [];
    const slugs = [...new Set([...Object.keys(folded.cms), ...Object.keys(folded.versions)])].sort();
    for (const slug of slugs) {
        const documents = transformCmsDocuments(slug, folded.cms[slug] ?? []);
        const history = transformCmsVersions(slug, folded.versions[slug] ?? [], documents.shopIdByDocument);
        cmsDocuments.push(...applyLatestVersionPointers(documents.cmsDocuments, history.latestVersionIdByDocument));
        cmsI18n.push(...documents.cms_i18n);
        // Chronological order is load-bearing for cmsVersions (the import's insertion order restores
        // the runtime `_creationTime` history ordering), so no payloadId re-sort here.
        cmsVersions.push(...history.cmsVersions);
        divergences.push(...documents.divergences, ...history.divergences);
    }

    const tables: Record<string, TransformedDoc[]> = {
        ...coreDataset,
        cmsDocuments: sortStagedRows(cmsDocuments),
        cms_i18n: sortStagedRows(cmsI18n),
        cmsVersions,
    };

    const duplicatePayloadIds: Record<string, string[]> = {};
    for (const [table, rows] of Object.entries(tables)) {
        const seen = new Set<string>();
        const duplicates = new Set<string>();
        for (const row of rows) {
            if (seen.has(row.payloadId)) duplicates.add(row.payloadId);
            seen.add(row.payloadId);
        }
        if (duplicates.size > 0) duplicatePayloadIds[table] = [...duplicates].sort();
    }

    return { tables, divergences, duplicatePayloadIds };
};

/**
 * Serializes one staged table to the JSONL shape `convex import` consumes — one `document` per
 * line, `payloadId` omitted (it is the linking key, never a stored field; the same contract as
 * `../import.ts`'s `serializeTable`). Pure.
 *
 * @param rows - The table's staged rows.
 * @returns The JSONL text (newline-terminated when non-empty).
 */
export const serializeRows = (rows: readonly TransformedDoc[]): string =>
    rows.length === 0 ? '' : `${rows.map((row) => JSON.stringify(row.document)).join('\n')}\n`;

/** The drain-lag report: how far Convex trails the outbox relative to the drain cursor. */
export interface DrainLag {
    /** Entries past the cursor — captured writes not yet certified applied. */
    undrainedCount: number;
    /** Capture ts of the OLDEST undrained entry (the lag clock's anchor), or `null` when drained. */
    oldestUndrainedTs: number | null;
    /** Capture ts of the LATEST undrained entry — the lag cursor's leading edge, or `null` when drained. */
    latestUndrainedTs: number | null;
    /** `now - oldestUndrainedTs`, or `0` when fully drained — the number the <=60s bound is measured on. */
    lagMs: number;
}

/**
 * Computes the drain lag of an outbox relative to the at-least-once cursor. Pure.
 *
 * @param entries - ALL known outbox entries, token-ordered.
 * @param cursorToken - The last token a successful `--execute` drain applied, or `null` before the first.
 * @param now - The measurement instant (epoch ms).
 * @returns The lag report.
 */
export const computeDrainLag = (
    entries: readonly ParsedOutboxEntry[],
    cursorToken: string | null,
    now: number,
): DrainLag => {
    const undrained = cursorToken === null ? [...entries] : entries.filter((entry) => entry.token > cursorToken);
    const first = undrained[0];
    const last = undrained[undrained.length - 1];
    return {
        undrainedCount: undrained.length,
        oldestUndrainedTs: first?.ts ?? null,
        latestUndrainedTs: last?.ts ?? null,
        lagMs: first ? Math.max(0, now - first.ts) : 0,
    };
};

/** The persisted drain cursor: pure at-least-once bookkeeping (never an apply precondition). */
export interface DrainCursor {
    /** Token of the last entry a successful `--execute` apply covered, or `null` before the first. */
    token: string | null;
    /** When that apply finished (epoch ms). */
    drainedAt: number | null;
    /** How many outbox entries that apply folded — a quick sanity number for the operator. */
    appliedEntries: number;
}

/**
 * Parses a persisted cursor file's contents, tolerating an absent/corrupt file by resetting to the
 * pre-first-drain cursor — safe BECAUSE the cursor is bookkeeping: a reset only widens the replay,
 * which is idempotent. Pure.
 *
 * @param content - The raw file contents, or `null` when the file does not exist.
 * @returns The cursor.
 */
export const parseDrainCursor = (content: string | null): DrainCursor => {
    if (content === null) return { token: null, drainedAt: null, appliedEntries: 0 };
    try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        return {
            token: typeof parsed.token === 'string' ? parsed.token : null,
            drainedAt: typeof parsed.drainedAt === 'number' ? parsed.drainedAt : null,
            appliedEntries: typeof parsed.appliedEntries === 'number' ? parsed.appliedEntries : 0,
        };
    } catch {
        return { token: null, drainedAt: null, appliedEntries: 0 };
    }
};

/**
 * Reads the frozen snapshot off the staging directory: every `<name>.jsonl` is classified through
 * {@link routeOutboxCollection} (core / cms / versions; underscore-prefixed pipeline files — the
 * outbox export included — are skipped, as is the `convex/` staged-output subdirectory).
 *
 * @param stagingDir - The ETL staging directory.
 * @returns The frozen snapshot.
 */
export const readFreezeSnapshot = (stagingDir: string): FreezeSnapshot => {
    const snapshot: FreezeSnapshot = { core: {}, cms: {}, versions: {} };
    for (const dirent of readdirSync(stagingDir, { withFileTypes: true })) {
        if (!dirent.isFile() || !dirent.name.endsWith('.jsonl')) continue;
        const name = dirent.name.slice(0, -'.jsonl'.length);
        const route = routeOutboxCollection(name);
        if (route.kind === 'skip') continue;
        const docs = parseJsonl(readFileSync(resolve(stagingDir, dirent.name), 'utf8'));
        if (route.kind === 'core') snapshot.core[route.collection] = docs;
        else if (route.kind === 'cms') snapshot.cms[route.slug] = docs;
        else snapshot.versions[route.slug] = docs;
    }
    return snapshot;
};

/**
 * Runs one drain iteration: export the outbox (`--execute`), fold it over the frozen snapshot,
 * stage every table, apply via `convex import --replace` (`--execute`), recompute the PIPELINE-04
 * expected checksums for the folded corpus, advance the cursor (`--execute`), and print the lag
 * report. Exits non-zero on any blocking defect (malformed outbox rows, divergences, duplicate
 * surrogate ids) — those are flip blockers, not warnings.
 *
 * @returns Nothing; the process exits explicitly.
 */
const main = async (): Promise<void> => {
    const stagingDir = resolveStagingDir();
    const execute = process.argv.includes('--execute');
    const outboxFile = resolve(stagingDir, `${OUTBOX_COLLECTION}.jsonl`);

    if (execute) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.error('[etl/outbox] MONGODB_URI is not set; refusing to run --execute.');
            process.exit(1);
        }
        console.info(`[etl/outbox] mongoexport ${OUTBOX_COLLECTION} -> ${outboxFile}`);
        execFileSync('mongoexport', buildMongoexportArgs(uri, OUTBOX_COLLECTION, outboxFile), { stdio: 'inherit' });
    }

    const raws = existsSync(outboxFile) ? parseJsonl(readFileSync(outboxFile, 'utf8')) : [];
    const { entries, malformed } = parseOutboxEntries(raws);
    if (malformed > 0) {
        console.error(`[etl/outbox] ${malformed} malformed outbox row(s) — a captured write may be lost. NO-GO.`);
        process.exit(1);
    }

    const cursorFile = resolve(stagingDir, OUTBOX_CURSOR_FILE);
    const cursor = parseDrainCursor(existsSync(cursorFile) ? readFileSync(cursorFile, 'utf8') : null);
    const lagBefore = computeDrainLag(entries, cursor.token, Date.now());
    console.info(
        `[etl/outbox] lag: ${lagBefore.undrainedCount} undrained entr(ies), ` +
            `oldest=${lagBefore.oldestUndrainedTs ?? '-'} latest=${lagBefore.latestUndrainedTs ?? '-'} lagMs=${lagBefore.lagMs}`,
    );

    const snapshot = readFreezeSnapshot(stagingDir);
    const folded = foldOutbox(snapshot, entries);
    const plan = planDrain(folded);

    if (plan.divergences.length > 0) {
        console.error(`[etl/outbox] ${plan.divergences.length} divergence(s) in freeze-window writes. NO-GO.`);
        for (const divergence of plan.divergences) console.error(`  - ${JSON.stringify(divergence)}`);
        process.exit(1);
    }
    if (Object.keys(plan.duplicatePayloadIds).length > 0) {
        console.error(`[etl/outbox] duplicate surrogate ids: ${JSON.stringify(plan.duplicatePayloadIds)}. NO-GO.`);
        process.exit(1);
    }

    const stageDir = resolve(stagingDir, 'convex');
    mkdirSync(stageDir, { recursive: true });
    for (const [table, rows] of Object.entries(plan.tables)) {
        const file = resolve(stageDir, `${table}.jsonl`);
        writeFileSync(file, serializeRows(rows));
        console.info(`[etl/outbox] staged ${rows.length} ${table} row(s) -> ${file}`);
        if (execute) {
            execFileSync('convex', buildConvexImportArgs(table, file), { stdio: 'inherit' });
        } else {
            console.info(`[etl/outbox] (dry) convex ${buildConvexImportArgs(table, file).join(' ')}`);
        }
    }

    const expected = await expectedChecksums(folded.core, folded.cms);
    const expectedFile = resolve(stageDir, RECONCILE_EXPECTED_FILE);
    writeFileSync(expectedFile, `${JSON.stringify(expected, null, 4)}\n`);
    console.info(`[etl/outbox] post-drain parity expectations -> ${expectedFile}`);
    console.info('[etl/outbox] GATE: run convex reconcile:run against that file; the flip is NO-GO until green.');

    if (execute) {
        const lastEntry = entries[entries.length - 1];
        const next: DrainCursor = {
            token: lastEntry?.token ?? cursor.token,
            drainedAt: Date.now(),
            appliedEntries: entries.length,
        };
        writeFileSync(cursorFile, `${JSON.stringify(next, null, 4)}\n`);
        console.info(`[etl/outbox] cursor advanced -> ${next.token ?? '-'} (${next.appliedEntries} entr(ies) applied)`);
        console.info('[etl/outbox] residual lag = writes captured AFTER this export; re-run until 0 (see runbook).');
    }
    process.exit(0);
};

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv.slice(1).some((arg) => {
    try {
        return realpathSync(resolve(arg)) === realpathSync(thisFile);
    } catch {
        return pathToFileURL(arg).href === import.meta.url;
    }
});

if (invokedDirectly) {
    main().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[etl/outbox] failed: ${message}`);
        process.exit(1);
    });
}
