/**
 * CUTOVER-01 dress-rehearsal driver: one orchestrated pass of the full pre-freeze pipeline —
 * export-shaped input → PIPELINE-01/02 transform → import into a target world → PIPELINE-04
 * dual-path checksum reconciliation — with per-phase wall-clock timings and per-collection row
 * counts, folded into a single GO/NO-GO report.
 *
 * The driver is deliberately world-agnostic: the import and reconcile halves run through the
 * injected {@link RehearsalWorld}, so the SAME orchestration drives the in-sandbox rehearsal
 * (`convex-test` world, `packages/test-convex/src/cutover-rehearsal.test.ts`) and an operator's
 * run against a real imported deployment. Everything this module computes itself is pure: the
 * transform, the expected-side checksums, the verdict, and the report rendering.
 *
 * The verdict is intentionally conservative — GO requires ALL of:
 * - zero transform divergences (a quarantined rich-text value means content would be dropped);
 * - zero mismatched collections in the reconcile summary;
 * - a ledger row for every compared collection, each reading `match` (the summary and the ledger
 *   must agree — a world that reports green while its ledger says otherwise is itself a failure).
 */
import { type CmsSourceCollections, type CollectionChecksum, expectedChecksums } from '../reconcile/checksum';
import { type ConvexImportDataset, type SourceDataset, type TransformedDoc, transform } from '../transform/index';
import { type CmsTransformDivergence, transformCmsDocuments } from '../transform/shred-richtext';

/** The export-shaped rehearsal input: the PIPELINE-01 core corpus plus raw CMS collections. */
export interface RehearsalSource {
    /** Raw mongoexport documents of the core (shops-family) collections. */
    core: SourceDataset;
    /** Raw mongoexport documents per CMS collection slug; omit for a core-only rehearsal. */
    cms?: CmsSourceCollections;
}

/** One staged CMS collection: the shredded parents plus their `cms_i18n` side rows. */
export interface StagedCmsCollection {
    /** The CMS collection slug (`articles`, `pages`, …). */
    slug: string;
    /** Staged `cmsDocuments` rows (inline data only, surrogate `shopId` references). */
    cmsDocuments: TransformedDoc[];
    /** Staged `cms_i18n` side rows (surrogate `parentId` references). */
    cms_i18n: TransformedDoc[];
}

/** The full staged dataset handed to the world's import phase. */
export interface StagedRehearsalDataset {
    /** The PIPELINE-01 core fan-out, keyed by destination Convex table. */
    core: ConvexImportDataset;
    /** The PIPELINE-02 CMS shred output, one entry per source collection. */
    cms: StagedCmsCollection[];
}

/** One per-collection parity verdict read back from the world's reconciliation ledger. */
export interface RehearsalLedgerRow {
    /** The ledger collection key (`shops`, `cmsDocuments:<slug>`, …). */
    collection: string;
    /** The recorded parity status. */
    status: 'match' | 'mismatch';
    /** Expected (script-side) document count. */
    expectedCount: number;
    /** Actual (Convex-side) document count. */
    actualCount: number;
}

/**
 * The import/reconcile seam the driver runs against. Implementations: the `convex-test` world for
 * the in-sandbox rehearsal; a real deployment (CLI import + admin-key `reconcile:run`) for the
 * operator's pre-freeze run.
 */
export interface RehearsalWorld {
    /**
     * Loads the staged dataset into the target deployment, relinking each surrogate reference
     * (`shop`, `shopId`, `flag`, `parentId`) to the real id assigned at insert.
     *
     * @param staged - The transform output to import.
     */
    importStaged(staged: StagedRehearsalDataset): Promise<void>;
    /**
     * Runs the PIPELINE-04 reconciliation sweep (`convex/reconcile.ts`'s `run` action) against the
     * imported world.
     *
     * @param args - The run id, the script-side expected checksums, and an optional page size.
     * @returns The sweep summary.
     */
    reconcile(args: {
        runId: string;
        expected: CollectionChecksum[];
        pageSize?: number;
    }): Promise<{ collections: number; mismatched: number }>;
    /**
     * Reads one run's parity rows from the `reconciliationLedger` table.
     *
     * @param runId - The reconcile run to read.
     * @returns The run's ledger rows.
     */
    ledger(runId: string): Promise<RehearsalLedgerRow[]>;
}

/** Wall-clock duration of each rehearsal phase, in milliseconds. */
export interface RehearsalPhaseTimings {
    /** PIPELINE-01 core transform plus the per-collection PIPELINE-02 CMS shred. */
    transformMs: number;
    /** Expected-side (script) checksum build, including the independent reassembly. */
    checksumMs: number;
    /** The world's import phase. */
    importMs: number;
    /** The world's reconcile sweep (Convex-side checksums + ledger writes). */
    reconcileMs: number;
    /** End-to-end driver duration. */
    totalMs: number;
}

/** One staged table's row count, flagged with whether the reconcile corpus covers it. */
export interface RehearsalRowCount {
    /** Destination Convex table (or `cms_i18n:<slug>` for a collection's side rows). */
    table: string;
    /** Staged row count. */
    rows: number;
    /**
     * Whether the PIPELINE-04 checksum corpus verifies this table. `shopCollaborators` is staged
     * but deliberately outside the corpus (covered by the PIPELINE-03 reference-integrity
     * verifier); `cms_i18n` side rows are verified THROUGH their reassembled parents.
     */
    reconciled: boolean;
}

/** The full dress-rehearsal result. */
export interface RehearsalReport {
    /** The reconcile run id the ledger rows were written under. */
    runId: string;
    /** Per-table staged row counts (the freeze-window volume figures). */
    rowCounts: RehearsalRowCount[];
    /** Every transform divergence (quarantined rich-text value); MUST be empty for GO. */
    divergences: CmsTransformDivergence[];
    /** The reconcile sweep summary as the world reported it. */
    summary: { collections: number; mismatched: number };
    /** The per-collection parity rows read back from the ledger. */
    ledger: RehearsalLedgerRow[];
    /** Per-phase wall-clock timings. */
    timings: RehearsalPhaseTimings;
    /** The aggregate verdict; `GO` only when every parity signal is green. */
    verdict: 'GO' | 'NO-GO';
}

/** Optional driver knobs. */
export interface RehearsalOptions {
    /** Ledger run id; defaults to a timestamped `cutover-rehearsal-*` id. */
    runId?: string;
    /** Reconcile page size override, forwarded to the world verbatim. */
    pageSize?: number;
}

/**
 * Stages the rehearsal corpus: the PIPELINE-01 core transform plus one PIPELINE-02 shred per CMS
 * collection. Pure.
 *
 * @param source - The export-shaped input.
 * @returns The staged dataset and every divergence the shred quarantined.
 */
export function stageRehearsal(source: RehearsalSource): {
    staged: StagedRehearsalDataset;
    divergences: CmsTransformDivergence[];
} {
    const core = transform(source.core);
    const cms: StagedCmsCollection[] = [];
    const divergences: CmsTransformDivergence[] = [];
    for (const [slug, raws] of Object.entries(source.cms ?? {})) {
        const shredded = transformCmsDocuments(slug, raws);
        cms.push({ slug, cmsDocuments: shredded.cmsDocuments, cms_i18n: shredded.cms_i18n });
        divergences.push(...shredded.divergences);
    }
    return { staged: { core, cms }, divergences };
}

/**
 * Derives the per-table staged row counts for the report. Pure.
 *
 * @param staged - The staged dataset.
 * @returns One row-count entry per staged table, CMS collections broken out per slug.
 */
export function countStagedRows(staged: StagedRehearsalDataset): RehearsalRowCount[] {
    const counts: RehearsalRowCount[] = (Object.keys(staged.core) as Array<keyof ConvexImportDataset>).map((table) => ({
        table,
        rows: staged.core[table].length,
        reconciled: table !== 'shopCollaborators',
    }));
    for (const collection of staged.cms) {
        counts.push({
            table: `cmsDocuments:${collection.slug}`,
            rows: collection.cmsDocuments.length,
            reconciled: true,
        });
        counts.push({ table: `cms_i18n:${collection.slug}`, rows: collection.cms_i18n.length, reconciled: false });
    }
    return counts;
}

/**
 * Decides the aggregate GO/NO-GO verdict from the parity signals. Pure; conservative by design —
 * any divergence, any mismatch, an empty ledger, or a summary/ledger disagreement reads NO-GO.
 *
 * @param divergences - Transform divergences (quarantined values).
 * @param summary - The reconcile sweep summary.
 * @param ledger - The ledger rows read back for the run.
 * @returns `GO` when every signal is green.
 */
export function decideVerdict(
    divergences: readonly CmsTransformDivergence[],
    summary: { collections: number; mismatched: number },
    ledger: readonly RehearsalLedgerRow[],
): 'GO' | 'NO-GO' {
    if (divergences.length > 0) return 'NO-GO';
    if (summary.mismatched > 0) return 'NO-GO';
    if (ledger.length === 0 || ledger.length !== summary.collections) return 'NO-GO';
    if (ledger.some((row) => row.status !== 'match' || row.expectedCount !== row.actualCount)) return 'NO-GO';
    return 'GO';
}

/**
 * Runs the full dress rehearsal against a world: stage → expected checksums → import → reconcile →
 * ledger read-back, timing each phase.
 *
 * @param source - The export-shaped rehearsal corpus.
 * @param world - The import/reconcile target.
 * @param options - Optional run id / page size knobs.
 * @returns The complete {@link RehearsalReport}.
 */
export async function runRehearsal(
    source: RehearsalSource,
    world: RehearsalWorld,
    options: RehearsalOptions = {},
): Promise<RehearsalReport> {
    const runId = options.runId ?? `cutover-rehearsal-${Date.now()}`;
    const startedAt = performance.now();

    const transformStart = performance.now();
    const { staged, divergences } = stageRehearsal(source);
    const transformMs = performance.now() - transformStart;

    const checksumStart = performance.now();
    const expected = await expectedChecksums(source.core, source.cms ?? {});
    const checksumMs = performance.now() - checksumStart;

    const importStart = performance.now();
    await world.importStaged(staged);
    const importMs = performance.now() - importStart;

    const reconcileStart = performance.now();
    const summary = await world.reconcile({ runId, expected, pageSize: options.pageSize });
    const reconcileMs = performance.now() - reconcileStart;

    const ledger = await world.ledger(runId);

    return {
        runId,
        rowCounts: countStagedRows(staged),
        divergences,
        summary,
        ledger,
        timings: {
            transformMs,
            checksumMs,
            importMs,
            reconcileMs,
            totalMs: performance.now() - startedAt,
        },
        verdict: decideVerdict(divergences, summary, ledger),
    };
}

/**
 * Renders a report as the markdown block `cutover-budgets.md` records. Pure and deterministic for
 * a given report (timings are rounded to whole milliseconds).
 *
 * @param report - The rehearsal result to render.
 * @returns A markdown fragment: verdict, timings, row counts, and the parity ledger.
 */
export function formatRehearsalReport(report: RehearsalReport): string {
    const ms = (value: number): string => `${Math.max(1, Math.round(value))} ms`;
    const lines: string[] = [
        `### Rehearsal run \`${report.runId}\` — **${report.verdict}**`,
        '',
        `Phases: transform ${ms(report.timings.transformMs)} · expected-side checksums ${ms(report.timings.checksumMs)} · import ${ms(report.timings.importMs)} · reconcile sweep ${ms(report.timings.reconcileMs)} · total ${ms(report.timings.totalMs)}`,
        '',
        '| Staged table | Rows | In checksum corpus |',
        '| --- | ---: | --- |',
        ...report.rowCounts.map(
            (entry) => `| \`${entry.table}\` | ${entry.rows} | ${entry.reconciled ? 'yes' : 'no — see driver JSDoc'} |`,
        ),
        '',
        `Reconcile summary: ${report.summary.collections} collections compared, ${report.summary.mismatched} mismatched. Transform divergences: ${report.divergences.length}.`,
        '',
        '| Ledger collection | Status | Expected | Actual |',
        '| --- | --- | ---: | ---: |',
        ...report.ledger.map(
            (row) => `| \`${row.collection}\` | ${row.status} | ${row.expectedCount} | ${row.actualCount} |`,
        ),
    ];
    if (report.divergences.length > 0) {
        lines.push('', '**Quarantined values:**');
        for (const divergence of report.divergences) {
            lines.push(
                `- \`${divergence.collection}/${divergence.legacyId}\` ${divergence.fieldPath ?? ''}${divergence.locale ? ` (${divergence.locale})` : ''}: ${divergence.reason}`,
            );
        }
    }
    return `${lines.join('\n')}\n`;
}
