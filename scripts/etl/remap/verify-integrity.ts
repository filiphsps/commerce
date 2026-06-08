#!/usr/bin/env tsx
/**
 * ETL post-import gate: a reference-integrity verifier that FAILS (non-zero exit) when any INTERNAL
 * surrogate reference in the migrated dataset dangles — points at no live target row. It composes the
 * reference graph (`./references`) with the external public-id checks (`./external-refs`) so one run
 * covers all three guarantees: every `shopId`/foreign-key reference resolves to a live row, every
 * shop preserved its public `legacyId`, and zero references dangle.
 *
 * Usage:
 *   tsx scripts/etl/remap/verify-integrity.ts            # verify the staged dataset; exit 1 on any dangling ref
 *
 * DEFERRED (live I/O): the runner verifies the in-memory transform of the staged source export (the
 * same per-collection extension surface as `../import.ts`). The auth-family `sessions`/`users`
 * collections are not in `SOURCE_COLLECTIONS` yet, so their edges activate the moment those
 * collections join the export — the verifier core itself is collection-agnostic and exercised end to
 * end by the golden fixtures.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveStagingDir, SOURCE_COLLECTIONS } from '../export';
import { parseJsonl } from '../import';
import { type Doc, type SourceDataset, transform } from '../transform/index';
import { verifyExternalShopRefs, verifyLegacyIdsPreserved } from './external-refs';
import { type AuthFamilySource, buildReferenceGraph, type Reference, type ReferenceGraph } from './references';

/** The outcome of a full reference-integrity verification. */
export interface IntegrityReport {
    ok: boolean;
    /** Every reference whose `toId` is absent from its target table's live-id set. */
    dangling: Reference[];
}

/**
 * Finds every reference in `graph` whose `toId` is not a live id of its target table. An edge is only
 * present in `graph.references` when its target is in the registry (see `buildReferenceGraph`), so a
 * missing registry entry here is treated as the empty set and the reference dangles — it can never
 * silently pass. Pure.
 *
 * @param graph - The reference graph to check.
 * @returns The dangling references, in graph order.
 */
export const findDanglingReferences = (graph: ReferenceGraph): Reference[] => {
    const dangling: Reference[] = [];
    for (const reference of graph.references) {
        if (!graph.liveIds[reference.toTable]?.has(reference.toId)) dangling.push(reference);
    }
    return dangling;
};

/**
 * Verifies referential integrity of a built reference graph: zero dangling references. Pure.
 *
 * @param graph - The reference graph from `buildReferenceGraph`.
 * @returns `{ ok, dangling }`; `ok` is true iff no reference dangles.
 */
export const verifyReferentialIntegrity = (graph: ReferenceGraph): IntegrityReport => {
    const dangling = findDanglingReferences(graph);
    return { ok: dangling.length === 0, dangling };
};

/**
 * Reads the staged `<collection>.jsonl` exports into a {@link SourceDataset}, skipping any collection
 * whose file is absent. Mirrors `../import.ts`'s reader so the verifier checks exactly what the import
 * stages.
 *
 * @param inDir - The staging directory holding the export files.
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
 * Reads the optional auth-family exports (`users.jsonl`/`sessions.jsonl`) that complete the reference
 * graph. Absent until those collections join the pipeline; their presence activates the `users`/
 * `sessions` edges.
 *
 * @param inDir - The staging directory.
 * @returns The raw auth-family documents present in the staging directory.
 */
const readAuthFamily = (inDir: string): AuthFamilySource => {
    const auth: AuthFamilySource = {};
    for (const collection of ['users', 'sessions'] as const) {
        const file = resolve(inDir, `${collection}.jsonl`);
        if (existsSync(file)) auth[collection] = parseJsonl(readFileSync(file, 'utf8')) as Doc[];
    }
    return auth;
};

/**
 * Verifies the staged dataset and exits non-zero on the first failing guarantee: a dangling internal
 * reference, a shop missing its public `legacyId`, or a sampled external id that no longer resolves.
 *
 * @returns Nothing; the process exits explicitly.
 */
const main = (): void => {
    const inDir = resolveStagingDir();
    const dataset = transform(readSourceDataset(inDir));
    const graph = buildReferenceGraph(dataset, readAuthFamily(inDir));

    const integrity = verifyReferentialIntegrity(graph);
    const legacy = verifyLegacyIdsPreserved(dataset);
    // Every preserved public id must round-trip through its own index — a self-check that the public
    // shop.id == legacyId contract still resolves post-import.
    const external = verifyExternalShopRefs(
        dataset,
        dataset.shops.map((row) => String(row.document.legacyId)),
    );

    console.info(`[etl/verify] references checked: ${graph.references.length}`);
    if (!integrity.ok) {
        for (const ref of integrity.dangling) {
            console.error(`[etl/verify] DANGLING ${ref.fromTable}.${ref.field} -> ${ref.toTable}#${ref.toId}`);
        }
    }
    if (!legacy.ok) {
        for (const id of legacy.missing) console.error(`[etl/verify] shop ${id} is missing its legacyId`);
    }
    if (!external.ok) {
        for (const id of external.unresolved) console.error(`[etl/verify] external shop.id ${id} resolves to no shop`);
    }

    if (!integrity.ok || !legacy.ok || !external.ok) {
        console.error('[etl/verify] reference integrity FAILED.');
        process.exit(1);
    }
    console.info('[etl/verify] reference integrity OK: zero dangling references.');
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
        console.error(`[etl/verify] failed: ${message}`);
        process.exit(1);
    }
}
