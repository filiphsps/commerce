#!/usr/bin/env tsx
/**
 * CUTOVER-03 "stop Mongo writes" verification: proves the retired storefront-services collections
 * stay write-quiet on the production Mongo after the authority flip, by exporting a window of the
 * replica-set oplog and classifying every CRUD entry. Between CUTOVER-03 and the CMS cohorts
 * (CUTOVER-04/05/06) the Payload CMS surface legitimately keeps writing its own DISJOINT
 * collections — those show up in the report as informational `observed` rows; any write to a
 * retired services collection is a violation and exits non-zero (flip verification FAILED).
 *
 * Usage (the runbook's post-flip step; URI must point at the `local` database, where the oplog lives):
 *   MONGODB_OPLOG_URI='mongodb://…/local?authSource=admin' tsx scripts/etl/oplog-quiet.ts
 *   OPLOG_WINDOW_MINUTES=60 … tsx scripts/etl/oplog-quiet.ts          # widen the watch window
 *   … tsx scripts/etl/oplog-quiet.ts --all                            # TEARDOWN posture: ANY write anywhere is a violation
 *
 * Caveat (documented, accepted): writes wrapped in `applyOps` surface as `op: 'c'` and are outside
 * the `i/u/d` query — running `applyOps` requires privileges no application writer holds on Atlas,
 * and the freeze checklist already forbids out-of-band writers. The PIPELINE-04 parity gate is the
 * backstop, exactly as for the outbox (`./outbox/runbook.md` §2).
 *
 * DEFERRED (live I/O): a real run needs a reachable Mongo replica set and `mongoexport` on PATH —
 * the same deferral as `./export.ts`. The classification cores are pure and unit-proven
 * (`./oplog-quiet.test.ts`).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Mongo collections the packages/db seam retired at the CUTOVER-03 flip — a post-flip write to any
 * of these means a second authoritative writer survived and the flip verification FAILS. Includes
 * `feature-flags`, the leftover Payload REST surface's slug spelling for the same data, so a write
 * through that mounted-but-retired route is caught under either name. Payload's own principal
 * collection is `payload-users` (`dbName` in `packages/cms/src/collections/build-users.ts`) and is
 * deliberately NOT listed: it belongs to the Payload surface that lives until TEARDOWN-02.
 */
export const RETIRED_SERVICE_COLLECTIONS = [
    'shops',
    'featureFlags',
    'feature-flags',
    'reviews',
    'users',
    'sessions',
    'identities',
] as const;

/** One normalized oplog CRUD entry. */
export interface OplogEntry {
    /** Namespace as `<db>.<collection>`. */
    ns: string;
    /** Operation: `i` insert, `u` update, `d` delete. */
    op: string;
    /** Wall-clock time of the write in epoch ms, when the entry carried one. */
    wallMs: number | null;
}

/** Per-namespace aggregation of oplog writes for the report. */
export interface OplogWriteSummary {
    ns: string;
    /** Distinct ops seen, sorted. */
    ops: string[];
    count: number;
    /** Newest wall-clock ms across the namespace's entries, when known. */
    lastWallMs: number | null;
}

/** The classification verdict: violations fail the run, observed rows are informational. */
export interface OplogClassification {
    violations: OplogWriteSummary[];
    observed: OplogWriteSummary[];
}

/**
 * Builds the `mongoexport` argv for the oplog window. Pure. The query restricts to CRUD ops since
 * `sinceMs` — `applyOps`/index builds (`op: 'c'`) and replication noops (`'n'`) are excluded by
 * design (see the module caveat).
 *
 * @param uri - Connection string pointing at the `local` database.
 * @param outFile - Absolute path of the JSONL file to write.
 * @param sinceMs - Window start, epoch ms.
 * @returns The `mongoexport` argument vector.
 */
export const buildOplogExportArgs = (uri: string, outFile: string, sinceMs: number): string[] => [
    `--uri=${uri}`,
    '--collection=oplog.rs',
    '--type=json',
    `--query=${JSON.stringify({ wall: { $gte: { $date: new Date(sinceMs).toISOString() } }, op: { $in: ['i', 'u', 'd'] } })}`,
    `--out=${outFile}`,
];

/**
 * Normalizes one parsed oplog JSONL document to an {@link OplogEntry}. Handles the extended-JSON
 * `wall` encodings mongoexport emits (`{ $date: string }` and `{ $date: { $numberLong } }`).
 *
 * @param doc - One parsed JSONL line.
 * @returns The normalized entry, or `null` when the document is not a CRUD entry with a namespace.
 */
export const normalizeOplogDoc = (doc: unknown): OplogEntry | null => {
    if (!doc || typeof doc !== 'object') return null;
    const record = doc as Record<string, unknown>;
    if (typeof record.ns !== 'string' || record.ns.length === 0 || typeof record.op !== 'string') return null;
    let wallMs: number | null = null;
    const wall = record.wall;
    if (wall && typeof wall === 'object') {
        const date = (wall as Record<string, unknown>).$date;
        if (typeof date === 'string') {
            const parsed = Date.parse(date);
            wallMs = Number.isNaN(parsed) ? null : parsed;
        } else if (date && typeof date === 'object') {
            const long = (date as Record<string, unknown>).$numberLong;
            if (typeof long === 'string') wallMs = Number(long);
        }
    }
    return { ns: record.ns, op: record.op, wallMs };
};

/**
 * Whether a namespace is replication/system housekeeping rather than application data — those are
 * never violations, in either mode.
 *
 * @param ns - The `<db>.<collection>` namespace.
 * @returns `true` for system databases and `system.*` collections.
 */
const isSystemNamespace = (ns: string): boolean => {
    const dot = ns.indexOf('.');
    const db = dot === -1 ? ns : ns.slice(0, dot);
    const collection = dot === -1 ? '' : ns.slice(dot + 1);
    return db === 'local' || db === 'admin' || db === 'config' || collection.startsWith('system.');
};

/**
 * Classifies a window of oplog CRUD entries against the retired-collection list. In the default
 * (services) mode a write is a violation when its collection name is retired, in ANY database — the
 * Payload CMS namespaces fall through to `observed`. `quietAll` is the TEARDOWN posture: every
 * non-system CRUD entry is a violation — the check for after the LAST Mongo writer is gone.
 *
 * @param entries - Normalized oplog entries (the window).
 * @param options - `retired` overrides the watch list; `quietAll` makes every non-system write a violation.
 * @returns Violations and informational observations, each aggregated per namespace.
 */
export const classifyOplogWrites = (
    entries: OplogEntry[],
    options: { retired?: readonly string[]; quietAll?: boolean } = {},
): OplogClassification => {
    const retired = new Set(options.retired ?? RETIRED_SERVICE_COLLECTIONS);
    const buckets = new Map<
        string,
        { ops: Set<string>; count: number; lastWallMs: number | null; violation: boolean }
    >();
    for (const entry of entries) {
        if (isSystemNamespace(entry.ns)) continue;
        const collection = entry.ns.slice(entry.ns.indexOf('.') + 1);
        const violation = options.quietAll === true || retired.has(collection);
        const bucket = buckets.get(entry.ns) ?? { ops: new Set<string>(), count: 0, lastWallMs: null, violation };
        bucket.ops.add(entry.op);
        bucket.count += 1;
        if (entry.wallMs !== null && (bucket.lastWallMs === null || entry.wallMs > bucket.lastWallMs)) {
            bucket.lastWallMs = entry.wallMs;
        }
        buckets.set(entry.ns, bucket);
    }
    const summarize = (violation: boolean): OplogWriteSummary[] =>
        [...buckets.entries()]
            .filter(([, bucket]) => bucket.violation === violation)
            .map(([ns, bucket]) => ({
                ns,
                ops: [...bucket.ops].sort(),
                count: bucket.count,
                lastWallMs: bucket.lastWallMs,
            }))
            .sort((a, b) => a.ns.localeCompare(b.ns));
    return { violations: summarize(true), observed: summarize(false) };
};

/**
 * Renders the human-readable report the runbook archives with the cutover audit trail.
 *
 * @param classification - The classified window.
 * @param windowMinutes - The watch-window size, for the header line.
 * @returns The report text, one line per namespace.
 */
export const renderOplogReport = (classification: OplogClassification, windowMinutes: number): string => {
    const lines: string[] = [
        `[etl/oplog-quiet] window=${windowMinutes}m violations=${classification.violations.length} observed=${classification.observed.length}`,
    ];
    const renderRow = (label: string, row: OplogWriteSummary): string =>
        `[etl/oplog-quiet] ${label} ${row.ns} ops=${row.ops.join(',')} count=${row.count} last=${row.lastWallMs === null ? 'unknown' : new Date(row.lastWallMs).toISOString()}`;
    for (const row of classification.violations) lines.push(renderRow('VIOLATION', row));
    for (const row of classification.observed) lines.push(renderRow('observed', row));
    if (classification.violations.length === 0) {
        lines.push('[etl/oplog-quiet] QUIET — no writes to retired services collections in the window.');
    }
    return lines.join('\n');
};

/**
 * Parses a mongoexport JSONL payload into normalized oplog entries, skipping blanks and non-CRUD
 * rows. Pure.
 *
 * @param content - The raw JSONL file contents.
 * @returns The normalized entries.
 */
export const parseOplogJsonl = (content: string): OplogEntry[] =>
    content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => normalizeOplogDoc(JSON.parse(line) as unknown))
        .filter((entry): entry is OplogEntry => entry !== null);

/**
 * Shells the oplog export, classifies the window, prints the report, and exits non-zero on any
 * violation.
 *
 * @returns Nothing; the process exits explicitly.
 */
const main = (): void => {
    const uri = process.env.MONGODB_OPLOG_URI;
    if (!uri) {
        console.error(
            "[etl/oplog-quiet] MONGODB_OPLOG_URI is not set (must target the 'local' database); refusing to run.",
        );
        process.exit(1);
    }
    const windowMinutes = Number(process.env.OPLOG_WINDOW_MINUTES ?? '15');
    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
        console.error(`[etl/oplog-quiet] invalid OPLOG_WINDOW_MINUTES: ${process.env.OPLOG_WINDOW_MINUTES}`);
        process.exit(1);
    }
    const quietAll = process.argv.includes('--all');
    const outFile = resolve(mkdtempSync(resolve(tmpdir(), 'oplog-quiet-')), 'oplog.jsonl');
    const sinceMs = Date.now() - windowMinutes * 60_000;
    execFileSync('mongoexport', buildOplogExportArgs(uri, outFile, sinceMs), {
        stdio: ['ignore', 'ignore', 'inherit'],
    });
    const classification = classifyOplogWrites(parseOplogJsonl(readFileSync(outFile, 'utf8')), { quietAll });
    console.info(renderOplogReport(classification, windowMinutes));
    process.exit(classification.violations.length === 0 ? 0 : 1);
};

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv.slice(1).some((arg) => {
    try {
        return resolve(arg) === thisFile;
    } catch {
        return pathToFileURL(arg).href === import.meta.url;
    }
});

if (invokedDirectly) {
    try {
        main();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[etl/oplog-quiet] failed: ${message}`);
        process.exit(1);
    }
}
