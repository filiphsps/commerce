#!/usr/bin/env tsx
/**
 * ETL stage 1 (export): shell `mongoexport` once per source collection into a JSONL file under the
 * staging directory. This is the thin I/O runner half of the pipeline — it owns no transform logic
 * (that lives in `./transform`), only the `mongoexport` invocation. The argument builder is exported
 * and pure so it can be unit-tested without a database; `main` runs ONLY on direct invocation, so
 * importing this module (e.g. for {@link SOURCE_COLLECTIONS}) never spawns a process.
 *
 * Usage:
 *   MONGODB_URI=… tsx scripts/etl/export.ts            # export every collection to $ETL_OUT_DIR (default ./.etl)
 *
 * DEFERRED (live I/O): a real run needs a reachable Mongo (`MONGODB_URI`) and the `mongoexport`
 * binary on PATH — neither is available in the migration sandbox, so the export step itself is
 * exercised only against a live source during the cut-over.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Source Mongo collections the pipeline exports, matching the keys the transform understands. The
 * pipeline is per-collection: extend it by adding a collection here and a transformer in
 * `./transform`.
 */
export const SOURCE_COLLECTIONS = ['shops', 'featureFlags', 'reviews'] as const;

/** One source Mongo collection name. */
export type SourceCollection = (typeof SOURCE_COLLECTIONS)[number];

/**
 * Builds the `mongoexport` argv for one collection. Pure — returns the argument vector without
 * spawning anything. `--type=json` writes one extended-JSON document per line (JSONL), the shape
 * `./import.ts` parses back.
 *
 * @param uri - The source Mongo connection string.
 * @param collection - The collection to export.
 * @param outFile - Absolute path of the JSONL file to write.
 * @returns The `mongoexport` argument vector.
 */
export const buildMongoexportArgs = (uri: string, collection: string, outFile: string): string[] => [
    `--uri=${uri}`,
    `--collection=${collection}`,
    '--type=json',
    `--out=${outFile}`,
];

/**
 * Resolves the staging directory the export writes into: `$ETL_OUT_DIR` when set, else `./.etl`
 * under the current working directory. Pure.
 *
 * @returns The absolute staging directory path.
 */
export const resolveStagingDir = (): string => process.env.ETL_OUT_DIR ?? resolve(process.cwd(), '.etl');

/**
 * Connects nothing itself — shells `mongoexport` for every {@link SOURCE_COLLECTIONS} entry into the
 * staging directory. Exits non-zero when `MONGODB_URI` is unset.
 *
 * @returns Nothing; the process exits explicitly.
 */
const main = (): void => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[etl/export] MONGODB_URI is not set; refusing to run.');
        process.exit(1);
    }
    const outDir = resolveStagingDir();
    mkdirSync(outDir, { recursive: true });
    for (const collection of SOURCE_COLLECTIONS) {
        const outFile = resolve(outDir, `${collection}.jsonl`);
        console.info(`[etl/export] mongoexport ${collection} -> ${outFile}`);
        execFileSync('mongoexport', buildMongoexportArgs(uri, collection, outFile), { stdio: 'inherit' });
    }
    console.info(`[etl/export] exported ${SOURCE_COLLECTIONS.length} collection(s) to ${outDir}`);
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
    try {
        main();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[etl/export] failed: ${message}`);
        process.exit(1);
    }
}
