/**
 * Clean-room reassembly of shredded CMS documents for the PIPELINE-04 reconciliation gate.
 *
 * This is deliberately a SECOND, independent implementation of the CMSDATA-10 reassemble-on-read
 * contract: it imports NOTHING from `packages/convex/convex/cms/i18n_shred.ts` (the runtime shred
 * module) and is written purely from the documented keying contract. The reconciliation's expected
 * (Mongo→transform) side reassembles through THIS module while the Convex-side sweep reassembles
 * through the runtime's own `reassembleShreddedFields`; a bug in either transform therefore surfaces
 * as a checksum DIVERGENCE between the two sides, where a single shared implementation would
 * reproduce the same wrong bytes on both sides and let the parity gate pass wrongly (the negative
 * test in `independent-reassembly.test.ts` proves exactly this).
 *
 * The CMSDATA-10 keying contract this implements:
 * - a shredded field is stored as ONE side row per `(parentId, fieldPath, locale)` triple;
 * - reassembly rebuilds each `fieldPath`'s locale bucket with one `locale → value` slot per row,
 *   slots written in side-row order (a duplicate `(fieldPath, locale)` slot is last-write-wins);
 * - each rebuilt bucket OVERLAYS the parent's inline data wholesale; inline fields without side rows
 *   pass through untouched.
 */

/**
 * One shredded side row as the reconciliation corpus carries it: the CMSDATA-10 key triple plus the
 * stored value. Mirrors the `cms_i18n` row layout structurally (string `parentId`, since the staged
 * dataset keys parents by surrogate id and the deployed table by Convex id) without importing any
 * shred-module type.
 */
export interface ShreddedSideRowRecord {
    /** The owning parent document's id (surrogate on the staged side, Convex id stringified live). */
    parentId: string;
    /** The top-level field the value was lifted from (e.g. `body`). */
    fieldPath: string;
    /** The BCP-47 locale slot the value is stored under. */
    locale: string;
    /** The locale's stored value, carried byte-for-byte. */
    value: unknown;
}

/**
 * Groups a flat side-row list by `parentId`, preserving each parent's row order — the corpus walk
 * that lets the expected-side checksum builder reassemble every parent from one staged `cms_i18n`
 * list. Pure.
 *
 * @param rows - The staged side rows, in staged order.
 * @returns Parent id → that parent's rows in input order.
 */
export function groupSideRowsByParent(rows: readonly ShreddedSideRowRecord[]): Map<string, ShreddedSideRowRecord[]> {
    const byParent = new Map<string, ShreddedSideRowRecord[]>();
    for (const row of rows) {
        const bucket = byParent.get(row.parentId);
        if (bucket) {
            bucket.push(row);
        } else {
            byParent.set(row.parentId, [row]);
        }
    }
    return byParent;
}

/**
 * Reassembles one shredded document from its inline data plus its side rows, per the CMSDATA-10
 * keying contract (see the module doc). Clean-room counterpart to the runtime's
 * `reassembleShreddedFields` — behaviorally identical on contract-conforming input, structurally
 * independent so a transform bug in either implementation diverges rather than agrees. Pure: never
 * mutates the inputs.
 *
 * @param inline - The parent's inline data (shredded fields absent); a non-object reassembles from `{}`.
 * @param rows - The parent's side rows, in stored order.
 * @returns A fresh field map with every shredded field's locale bucket restored onto the inline data.
 */
export function independentReassembly(
    inline: unknown,
    rows: readonly ShreddedSideRowRecord[],
): Record<string, unknown> {
    const base: Record<string, unknown> =
        typeof inline === 'object' && inline !== null ? { ...(inline as Record<string, unknown>) } : {};

    // Two passes on purpose (vs the runtime's single grouped pass): first the field list in
    // first-seen order, then each field's bucket — a structurally different walk of the same contract.
    const fieldOrder: string[] = [];
    for (const row of rows) {
        if (!fieldOrder.includes(row.fieldPath)) fieldOrder.push(row.fieldPath);
    }

    for (const fieldPath of fieldOrder) {
        const bucket: Record<string, unknown> = {};
        for (const row of rows) {
            if (row.fieldPath !== fieldPath) continue;
            bucket[row.locale] = row.value;
        }
        base[fieldPath] = bucket;
    }
    return base;
}
