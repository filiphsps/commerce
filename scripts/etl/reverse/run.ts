#!/usr/bin/env tsx
/**
 * CUTOVER-02 reverse-ETL runner — the G2 rollback tool's thin I/O half (all inversion logic lives
 * in `./invert.ts`, all comparison in `./round-trip.ts`). Three modes:
 *
 *   tsx scripts/etl/reverse/run.ts --verify [corpusDir]
 *       Round-trip gate: read the mongoexport corpus (default `$ETL_OUT_DIR`/`./.etl`, the same
 *       staging dir `../export.ts` writes), drive forward→reverse, compare checksums against the
 *       original. Exit 1 on ANY divergence, mismatch, or an empty corpus (which proves nothing).
 *
 *   tsx scripts/etl/reverse/run.ts --restore <snapshotDir> [--out <dir>]
 *       Rollback staging: read a Convex snapshot (an unzipped `convex export`, `<table>.jsonl` or
 *       `<table>/documents.jsonl`), invert it, and write mongoimport-ready JSONL per core
 *       collection (default `<staging>/mongo-restore`). Exit 1 on any divergence.
 *
 *   tsx scripts/etl/reverse/run.ts --compare <dirA> <dirB>
 *       Backup restore verification: checksum two mongoexport corpora (e.g. the pre-backup export
 *       vs a scratch-restore export) through the same PIPELINE-04 comparator. Exit 1 on mismatch.
 *
 * The exported helpers are pure so they unit-test without a deployment; `main` runs ONLY on direct
 * invocation. DEFERRED (live I/O): a real rollback additionally shells `mongoimport` per emitted
 * file — the exact commands are printed by `--restore` and documented in
 * `.specs/2026-05-30-convex-migration/one-way-gate.md`.
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveStagingDir, SOURCE_COLLECTIONS } from '../export';
import { parseJsonl } from '../import';
import type { Doc, SourceDataset } from '../transform/index';
import {
    type ConvexSnapshotDataset,
    invertSnapshot,
    MONGO_RESTORE_COLLECTIONS,
    type ReverseResult,
    SNAPSHOT_TABLES,
} from './invert';
import { compareSources, formatRoundTripReport, type RoundTripReport, roundTrip } from './round-trip';

/**
 * Reads a mongoexport corpus directory (`<collection>.jsonl` per source collection) into a
 * {@link SourceDataset}, skipping absent files — the same read `../import.ts` performs.
 *
 * @param dir - The corpus directory.
 * @returns The parsed source dataset.
 */
export const readCorpus = (dir: string): SourceDataset => {
    const dataset: SourceDataset = {};
    for (const collection of SOURCE_COLLECTIONS) {
        const file = resolve(dir, `${collection}.jsonl`);
        if (!existsSync(file)) continue;
        dataset[collection] = parseJsonl(readFileSync(file, 'utf8'));
    }
    return dataset;
};

/**
 * Reads a Convex snapshot directory into a {@link ConvexSnapshotDataset}. Accepts both the flat
 * `<table>.jsonl` layout and the `<table>/documents.jsonl` layout an unzipped `convex export`
 * snapshot uses; absent tables are skipped (e.g. a deployment without auth rows).
 *
 * @param dir - The snapshot directory.
 * @returns The parsed snapshot dataset.
 */
export const readSnapshotDataset = (dir: string): ConvexSnapshotDataset => {
    const dataset: ConvexSnapshotDataset = {};
    for (const table of SNAPSHOT_TABLES) {
        const flat = resolve(dir, `${table}.jsonl`);
        const nested = resolve(dir, table, 'documents.jsonl');
        const file = existsSync(flat) ? flat : existsSync(nested) ? nested : null;
        if (!file) continue;
        dataset[table] = parseJsonl(readFileSync(file, 'utf8'));
    }
    return dataset;
};

/**
 * Serializes one restore collection to mongoimport-ready JSONL (extended JSON, one document per
 * line). Pure.
 *
 * @param docs - The collection's restore documents.
 * @returns The JSONL text (newline-terminated when non-empty).
 */
export const serializeRestoreCollection = (docs: readonly Doc[]): string =>
    docs.length === 0 ? '' : `${docs.map((doc) => JSON.stringify(doc)).join('\n')}\n`;

/**
 * Builds the `mongoimport` argv for one restored collection. Pure. `--drop` replaces the target
 * collection wholesale — post-flip Convex was the single authority, so a rollback restore is a
 * replacement, never a merge (merging minted-id rows over originals would duplicate them; see the
 * one-way gate doc).
 *
 * @param uri - The target Mongo connection string.
 * @param collection - The Mongo collection to restore.
 * @param file - Absolute path of the restore JSONL file.
 * @returns The `mongoimport` argument vector.
 */
export const buildMongoimportArgs = (uri: string, collection: string, file: string): string[] => [
    `--uri=${uri}`,
    `--collection=${collection}`,
    '--type=json',
    '--drop',
    `--file=${file}`,
];

/**
 * Maps a parity report to the process exit code: non-zero on any mismatch, any reverse divergence,
 * or an EMPTY corpus — zero compared documents would let a misconfigured staging dir read green.
 *
 * @param report - The parity report.
 * @returns `0` when the gate is green, `1` otherwise.
 */
export const reportExitCode = (report: RoundTripReport): number => (report.ok && report.documents > 0 ? 0 : 1);

/**
 * Stages a reverse result to disk: one mongoimport-ready JSONL file per non-empty core collection,
 * returning the written files for reporting.
 *
 * @param result - The inversion result.
 * @param outDir - The directory to write into (created when absent).
 * @returns One `(collection, file, rows)` entry per written file.
 */
export const writeRestoreFiles = (
    result: ReverseResult,
    outDir: string,
): Array<{ collection: string; file: string; rows: number }> => {
    mkdirSync(outDir, { recursive: true });
    const written: Array<{ collection: string; file: string; rows: number }> = [];
    for (const collection of MONGO_RESTORE_COLLECTIONS) {
        const docs = result.collections[collection];
        if (docs.length === 0) continue;
        const file = resolve(outDir, `${collection}.jsonl`);
        writeFileSync(file, serializeRestoreCollection(docs));
        written.push({ collection, file, rows: docs.length });
    }
    return written;
};

/**
 * Dispatches the CLI mode, prints the operator-facing report, and exits with the gate verdict.
 *
 * @returns Nothing; the process exits explicitly.
 */
const main = async (): Promise<void> => {
    const args = process.argv.slice(2);
    const stagingDir = resolveStagingDir();

    if (args.includes('--restore')) {
        const snapshotDir = args[args.indexOf('--restore') + 1];
        if (!snapshotDir || snapshotDir.startsWith('--')) {
            console.error('[etl/reverse] --restore requires a snapshot directory.');
            process.exit(1);
            return;
        }
        const outFlag = args.indexOf('--out');
        const outDir =
            outFlag >= 0 && args[outFlag + 1] ? String(args[outFlag + 1]) : resolve(stagingDir, 'mongo-restore');
        const result = invertSnapshot(readSnapshotDataset(resolve(snapshotDir)));
        const written = writeRestoreFiles(result, outDir);
        for (const entry of written) {
            console.info(`[etl/reverse] staged ${entry.rows} ${entry.collection} document(s) -> ${entry.file}`);
            console.info(
                `[etl/reverse] (dry) mongoimport ${buildMongoimportArgs(process.env.MONGODB_URI ?? '<MONGODB_URI>', entry.collection, entry.file).join(' ')}`,
            );
        }
        if (result.divergences.length > 0) {
            console.error(`[etl/reverse] ${result.divergences.length} divergence(s):`);
            for (const divergence of result.divergences) {
                console.error(`- ${divergence.table}/${divergence.id}: ${divergence.reason}`);
            }
            process.exit(1);
        }
        process.exit(0);
        return;
    }

    if (args.includes('--compare')) {
        const index = args.indexOf('--compare');
        const dirA = args[index + 1];
        const dirB = args[index + 2];
        if (!dirA || !dirB || dirA.startsWith('--') || dirB.startsWith('--')) {
            console.error('[etl/reverse] --compare requires two corpus directories.');
            process.exit(1);
            return;
        }
        const report = await compareSources(readCorpus(resolve(dirA)), readCorpus(resolve(dirB)), []);
        console.info(formatRoundTripReport(report));
        process.exit(reportExitCode(report));
        return;
    }

    const positional = args.filter((arg) => !arg.startsWith('--'));
    const corpusDir = positional[0] ? resolve(positional[0]) : stagingDir;
    const report = await roundTrip(readCorpus(corpusDir));
    console.info(formatRoundTripReport(report));
    if (report.documents === 0) {
        console.error(`[etl/reverse] empty corpus in ${corpusDir} — an empty round trip proves nothing.`);
    }
    process.exit(reportExitCode(report));
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
        console.error(`[etl/reverse] failed: ${message}`);
        process.exit(1);
    });
}
