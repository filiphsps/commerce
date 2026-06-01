#!/usr/bin/env tsx
/**
 * ETL stage 3 (import): read the JSONL `./export.ts` produced, run the pure `./transform`, stage one
 * JSONL file per destination Convex table, and (with `--execute`) shell `convex import` per table.
 * This is the thin I/O runner half — all remapping lives in `./transform`; this file only parses,
 * stages, and shells. The argument builder and the parser are exported and pure so they unit-test
 * without a deployment; `main` runs ONLY on direct invocation.
 *
 * Usage:
 *   tsx scripts/etl/import.ts             # parse + transform + stage per-table JSONL (no writes to Convex)
 *   tsx scripts/etl/import.ts --execute   # additionally shell `convex import --table … --replace` per table
 *
 * DEFERRED (live I/O): `--execute` needs the `convex` CLI authed against a deployment, unavailable in
 * the migration sandbox. Two further live-only concerns are out of scope for this transform core and
 * resolved during cut-over: (a) a per-table `--table` import assigns fresh `_id`s and rejects a
 * reserved `_id` field, so the schema's `v.id(...)` foreign keys (which the staged rows carry as the
 * referenced row's deterministic surrogate id) are reconciled to the assigned `_id`s by a post-import
 * relink keyed on `legacyId` (or via a snapshot-ZIP import that preserves ids); (b) the surrogate id
 * is a stable derivation, not a deployment-issued id — the deterministic `payloadId` is what makes
 * that reconciliation, and therefore a re-run, idempotent.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveStagingDir, SOURCE_COLLECTIONS } from './export';
import { type ConvexImportDataset, type Doc, type SourceDataset, transform } from './transform/index';

/**
 * Parses a mongoexport JSONL payload into documents, skipping blank lines. Pure.
 *
 * @param content - The raw JSONL file contents.
 * @returns One parsed document per non-empty line.
 */
export const parseJsonl = (content: string): Doc[] =>
    content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as Doc);

/**
 * Serializes a table's transformed rows to JSONL — one `document` per line. The `payloadId` is the
 * import linking key, not a stored field, so it is intentionally omitted from the line. Pure.
 *
 * @param dataset - The transformed dataset.
 * @param table - The destination table to serialize.
 * @returns The JSONL text (newline-terminated when non-empty).
 */
export const serializeTable = (dataset: ConvexImportDataset, table: keyof ConvexImportDataset): string => {
    const rows = dataset[table];
    if (rows.length === 0) return '';
    return `${rows.map((row) => JSON.stringify(row.document)).join('\n')}\n`;
};

/**
 * Builds the `convex import` argv for one staged table file. Pure. `--replace` swaps the table's
 * contents wholesale and `--yes` skips the destructive-import prompt, so a re-run lands identical
 * content (idempotent at the table level).
 *
 * @param table - The destination Convex table name.
 * @param file - Absolute path of the staged JSONL file.
 * @returns The `convex import` argument vector.
 */
export const buildConvexImportArgs = (table: string, file: string): string[] => [
    'import',
    '--table',
    table,
    '--replace',
    '--yes',
    file,
];

/**
 * Reads the staged exports into a {@link SourceDataset}, skipping any collection whose file is
 * absent.
 *
 * @param inDir - The staging directory holding `<collection>.jsonl` files.
 * @returns The parsed source dataset.
 */
const readSourceDataset = (inDir: string): SourceDataset => {
    const dataset: SourceDataset = {};
    for (const collection of SOURCE_COLLECTIONS) {
        const file = resolve(inDir, `${collection}.jsonl`);
        if (!existsSync(file)) continue;
        dataset[collection] = parseJsonl(readFileSync(file, 'utf8'));
    }
    return dataset;
};

/**
 * Parses the staged exports, runs the pure transform, writes one JSONL file per Convex table, and —
 * only with `--execute` — shells `convex import` per table.
 *
 * @returns Nothing; the process exits explicitly.
 */
const main = (): void => {
    const inDir = resolveStagingDir();
    const dataset = transform(readSourceDataset(inDir));
    const stageDir = resolve(inDir, 'convex');
    mkdirSync(stageDir, { recursive: true });
    const execute = process.argv.includes('--execute');

    for (const table of Object.keys(dataset) as Array<keyof ConvexImportDataset>) {
        const file = resolve(stageDir, `${table}.jsonl`);
        writeFileSync(file, serializeTable(dataset, table));
        console.info(`[etl/import] staged ${dataset[table].length} ${table} row(s) -> ${file}`);
        if (execute) {
            execFileSync('convex', buildConvexImportArgs(table, file), { stdio: 'inherit' });
        } else {
            console.info(`[etl/import] (dry) convex ${buildConvexImportArgs(table, file).join(' ')}`);
        }
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
    try {
        main();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[etl/import] failed: ${message}`);
        process.exit(1);
    }
}
