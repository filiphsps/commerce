/**
 * CUTOVER-02 round-trip parity gate: proves the reverse-ETL inverts the forward transform on a
 * corpus by driving `original → forward transform → reverse → checksum` and comparing against the
 * checksums of the original — with the PIPELINE-04 checksum module (`../reconcile/checksum.ts`,
 * itself built on `packages/convex/convex/lib/checksum.ts`) as the ONLY comparator. Parity here
 * means parity in the SAME canonical logical projection every other gate of this migration uses
 * (volatile `_id`/`_creationTime` stripped, id references mapped to stable identities), so "the
 * reverse is correct" and "the cutover reconciliation is green" are claims in one shared currency.
 *
 * Raw-byte equality against the original Mongo documents is deliberately NOT the contract: the
 * forward transform already normalizes (extended-JSON dialects, defaulted `targeting`, dropped
 * unknown fields) and `reviews` carry no preserved ObjectId — the canonical projection is the
 * strongest honest invariant, and it is exactly the one production parity was proven in.
 */
import { type CollectionChecksum, expectedChecksums } from '../reconcile/checksum';
import { type SourceDataset, transform } from '../transform/index';
import { invertSnapshot, type ReverseDivergence, snapshotFromStaged } from './invert';

/** One collection's round-trip parity verdict. */
export interface RoundTripCollectionParity {
    /** The PIPELINE-04 ledger collection key. */
    collection: string;
    /** `match` when rollup, count, and the full per-document hash multiset agree. */
    status: 'match' | 'mismatch';
    /** Checksum rollup of the original corpus. */
    expectedRollup: string;
    /** Checksum rollup of the reversed corpus. */
    actualRollup: string;
    /** Document count in the original corpus. */
    expectedCount: number;
    /** Document count in the reversed corpus. */
    actualCount: number;
    /** Original per-document hashes absent from the reversed side (the divergence locator). */
    missingDocs: number;
    /** Reversed per-document hashes absent from the original side. */
    unexpectedDocs: number;
}

/** The full round-trip gate report. */
export interface RoundTripReport {
    /** Per-collection parity, sorted by collection key. */
    collections: RoundTripCollectionParity[];
    /** Every divergence the reverse stage itself reported (a non-invertible row). */
    reverseDivergences: ReverseDivergence[];
    /** Total documents on the original side — a zero-document corpus proves nothing. */
    documents: number;
    /** `true` only when every collection matches AND the reverse reported zero divergences. */
    ok: boolean;
}

/**
 * Compares two corpora per collection through the PIPELINE-04 checksum module. Exposed separately
 * from {@link roundTrip} so tests can inject a tampered reversed corpus, and so the backup
 * restore-verification mode (`./run.ts --compare`) can reuse the identical comparator.
 *
 * @param original - The reference corpus (raw mongoexport-shaped documents).
 * @param reversed - The corpus under test (the reverse-ETL output, or a second export).
 * @param reverseDivergences - Divergences the reverse stage reported; any entry fails the gate.
 * @returns The parity report.
 */
export async function compareSources(
    original: SourceDataset,
    reversed: SourceDataset,
    reverseDivergences: readonly ReverseDivergence[],
): Promise<RoundTripReport> {
    const expected = await expectedChecksums(original);
    const actual = await expectedChecksums(reversed);
    const actualByCollection = new Map<string, CollectionChecksum>(actual.map((entry) => [entry.collection, entry]));

    const collections: RoundTripCollectionParity[] = expected.map((entry) => {
        const counterpart = actualByCollection.get(entry.collection);
        const actualHashes = counterpart?.docHashes ?? [];
        const remaining = new Map<string, number>();
        for (const hash of actualHashes) remaining.set(hash, (remaining.get(hash) ?? 0) + 1);
        let missingDocs = 0;
        for (const hash of entry.docHashes) {
            const count = remaining.get(hash) ?? 0;
            if (count === 0) missingDocs += 1;
            else remaining.set(hash, count - 1);
        }
        let unexpectedDocs = 0;
        for (const count of remaining.values()) unexpectedDocs += count;

        const match =
            counterpart !== undefined &&
            counterpart.rollup === entry.rollup &&
            counterpart.count === entry.count &&
            missingDocs === 0 &&
            unexpectedDocs === 0;
        return {
            collection: entry.collection,
            status: match ? 'match' : 'mismatch',
            expectedRollup: entry.rollup,
            actualRollup: counterpart?.rollup ?? '',
            expectedCount: entry.count,
            actualCount: counterpart?.count ?? 0,
            missingDocs,
            unexpectedDocs,
        };
    });

    const documents = expected.reduce((sum, entry) => sum + entry.count, 0);
    return {
        collections,
        reverseDivergences: [...reverseDivergences],
        documents,
        ok: collections.every((entry) => entry.status === 'match') && reverseDivergences.length === 0,
    };
}

/**
 * Runs the full round-trip gate on a corpus: forward transform, snapshot adaptation, reverse, then
 * checksum comparison against the original. Pure (no I/O); the CLI in `./run.ts` wires it to disk.
 *
 * Only the forward-transformed source collections participate — the auth family never rode the
 * forward transform (it has no mongoexport source in the pipeline), so its inversion is covered by
 * the mirror tests in `invert.test.ts` rather than this transform round trip.
 *
 * @param source - The raw mongoexport-shaped corpus.
 * @returns The parity report.
 */
export async function roundTrip(source: SourceDataset): Promise<RoundTripReport> {
    const staged = transform(source);
    const { collections, divergences } = invertSnapshot(snapshotFromStaged(staged));
    const reversed: SourceDataset = {
        shops: collections.shops,
        featureFlags: collections.featureFlags,
        reviews: collections.reviews,
    };
    return compareSources(source, reversed, divergences);
}

/**
 * Renders a report as a fixed-width console table plus the divergence list — the operator-facing
 * output of `./run.ts --verify`. Pure and deterministic for a given report.
 *
 * @param report - The round-trip result to render.
 * @returns The multi-line report text.
 */
export function formatRoundTripReport(report: RoundTripReport): string {
    const lines: string[] = [
        `Round-trip parity: ${report.ok ? 'GREEN' : 'RED'} (${report.documents} document(s) compared)`,
        '',
        'collection            status    expected  actual  missing  unexpected',
    ];
    for (const entry of report.collections) {
        lines.push(
            `${entry.collection.padEnd(22)}${entry.status.padEnd(10)}${String(entry.expectedCount).padEnd(10)}${String(entry.actualCount).padEnd(8)}${String(entry.missingDocs).padEnd(9)}${entry.unexpectedDocs}`,
        );
    }
    if (report.reverseDivergences.length > 0) {
        lines.push('', `Reverse divergences (${report.reverseDivergences.length}):`);
        for (const divergence of report.reverseDivergences) {
            lines.push(`- ${divergence.table}/${divergence.id}: ${divergence.reason}`);
        }
    }
    return `${lines.join('\n')}\n`;
}
