import { ConvexError } from 'convex/values';

/**
 * Stable string code carried on the {@link BoundedScanExceededError} payload, so call sites and
 * `convex-test` branch on the cause without string-matching messages. Convex functions run in the
 * Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a `ConvexError`
 * payload with a stable code is the sanctioned in-runtime error contract (the same pattern as
 * `cms/access.ts`'s `CmsAccessErrorCode` and `cms/documents.ts`'s `CmsDocumentErrorCode`).
 */
export const ScanBudgetErrorCode = {
    /** A tenant scan reached the document or byte ceiling before completing. */
    BOUNDED_SCAN_EXCEEDED: 'CMS_BOUNDED_SCAN_EXCEEDED',
} as const;

/**
 * Document-count ceiling for a single bounded scan. Convex aborts a query that reads more than 32 768
 * documents with an opaque, untyped runtime error; this guardrail stops one document shy of that hard
 * limit so an over-large tenant list fails with the TYPED {@link BoundedScanExceededError} instead —
 * a deterministic signal the caller can branch on rather than a leaked engine error or, worse, a
 * silently truncated result.
 */
export const SCAN_DOCUMENT_BUDGET = 32_768;

/**
 * Approximate byte ceiling for a single bounded scan. Convex aborts a query whose cumulative read
 * crosses 16 MiB; this matches that limit so a scan of unusually large documents fails typed before
 * the engine's untyped abort. The accumulated size is an approximation (UTF-16 serialized length),
 * which always over- or roughly-counts the on-wire bytes, so the guardrail trips no later than the
 * real ceiling.
 */
export const SCAN_BYTE_BUDGET = 16 * 1024 * 1024;

/**
 * The structured payload every {@link BoundedScanExceededError} carries: the stable code plus the
 * counters and the budgets they crossed, so a caller can report exactly which ceiling tripped.
 */
export type BoundedScanExceededData = {
    readonly code: typeof ScanBudgetErrorCode.BOUNDED_SCAN_EXCEEDED;
    readonly message: string;
    /** Number of documents read at the moment the scan aborted. */
    readonly scanned: number;
    /** The document ceiling in force for the aborted scan. */
    readonly documentBudget: number;
    /** Approximate serialized bytes read at the moment the scan aborted. */
    readonly bytes: number;
    /** The byte ceiling in force for the aborted scan. */
    readonly byteBudget: number;
};

/**
 * Typed error thrown the instant a bounded scan reaches its document or byte ceiling. A
 * `ConvexError` subclass so handlers can both `instanceof`-narrow it in-isolate AND read its stable
 * `data.code` once it has crossed the function boundary (where `convex-test`/the client reconstruct a
 * plain `ConvexError` preserving only `data`).
 */
export class BoundedScanExceededError extends ConvexError<BoundedScanExceededData> {
    /**
     * @param info - The counters and budgets captured at the abort point.
     */
    constructor(info: { scanned: number; documentBudget: number; bytes: number; byteBudget: number }) {
        super({
            code: ScanBudgetErrorCode.BOUNDED_SCAN_EXCEEDED,
            message:
                `Bounded scan exceeded: read ${info.scanned} document(s) / ~${info.bytes} byte(s) ` +
                `against a budget of ${info.documentBudget} document(s) / ${info.byteBudget} byte(s).`,
            scanned: info.scanned,
            documentBudget: info.documentBudget,
            bytes: info.bytes,
            byteBudget: info.byteBudget,
        });
        this.name = 'BoundedScanExceededError';
    }
}

/**
 * A per-scan budget override. Both ceilings default to the module constants; tests pass tighter values
 * to exercise the abort path without seeding tens of thousands of rows.
 */
export type ScanBudget = {
    /** Document ceiling; defaults to {@link SCAN_DOCUMENT_BUDGET}. */
    readonly documentBudget?: number;
    /** Approximate byte ceiling; defaults to {@link SCAN_BYTE_BUDGET}. */
    readonly byteBudget?: number;
};

/**
 * Approximate serialized byte size of a Convex document, used to accumulate the byte budget. JSON
 * serialization length is a cheap proxy that over-counts versus the on-wire encoding, so it can only
 * make the budget trip earlier — never later than the engine's real ceiling. Values that fail to
 * serialize (none are expected for stored Convex documents) contribute zero rather than throwing.
 *
 * @param value - The document to size.
 * @returns The approximate byte count, or `0` when the value cannot be serialized.
 */
function approximateBytes(value: unknown): number {
    try {
        return JSON.stringify(value)?.length ?? 0;
    } catch {
        return 0;
    }
}

/**
 * Counts the documents yielded by a tenant-scoped query, aborting with a
 * {@link BoundedScanExceededError} the moment the running count or approximate byte total reaches its
 * ceiling. Streams the source (never `.collect()`), so a runaway tenant never materializes an
 * unbounded array — the count path fails loud well before Convex's own hard read limit.
 *
 * @param source - An async-iterable Convex query (e.g. `ctx.db.query(...).withIndex(...)`).
 * @param budget - Optional per-scan ceiling overrides; defaults to the module budgets.
 * @returns The exact document count when the full source fits within budget.
 * @throws {BoundedScanExceededError} When the document or byte ceiling is reached before the source is drained.
 */
export async function countWithinBudget<T>(source: AsyncIterable<T>, budget: ScanBudget = {}): Promise<number> {
    const documentBudget = budget.documentBudget ?? SCAN_DOCUMENT_BUDGET;
    const byteBudget = budget.byteBudget ?? SCAN_BYTE_BUDGET;

    let scanned = 0;
    let bytes = 0;
    for await (const item of source) {
        scanned += 1;
        bytes += approximateBytes(item);
        if (scanned >= documentBudget || bytes >= byteBudget) {
            throw new BoundedScanExceededError({ scanned, documentBudget, bytes, byteBudget });
        }
    }
    return scanned;
}

/**
 * Drains a tenant-scoped query into an array under the same ceilings as {@link countWithinBudget},
 * aborting with a {@link BoundedScanExceededError} before the document or byte budget is crossed. The
 * bounded counterpart to `.collect()` for read paths that genuinely need every in-budget row.
 *
 * @param source - An async-iterable Convex query.
 * @param budget - Optional per-scan ceiling overrides; defaults to the module budgets.
 * @returns The collected items plus the document and approximate-byte totals scanned.
 * @throws {BoundedScanExceededError} When the document or byte ceiling is reached before the source is drained.
 */
export async function collectWithinBudget<T>(
    source: AsyncIterable<T>,
    budget: ScanBudget = {},
): Promise<{ items: T[]; scanned: number; bytes: number }> {
    const documentBudget = budget.documentBudget ?? SCAN_DOCUMENT_BUDGET;
    const byteBudget = budget.byteBudget ?? SCAN_BYTE_BUDGET;

    const items: T[] = [];
    let bytes = 0;
    for await (const item of source) {
        bytes += approximateBytes(item);
        items.push(item);
        if (items.length >= documentBudget || bytes >= byteBudget) {
            throw new BoundedScanExceededError({ scanned: items.length, documentBudget, bytes, byteBudget });
        }
    }
    return { items, scanned: items.length, bytes };
}
