import { ConvexError } from 'convex/values';

/**
 * Stable string code carried on every {@link ConvexError} the checksum core throws, so call sites and
 * tests branch on the cause without string-matching messages — the same in-isolate error contract as
 * `lib/scan_budget.ts`'s `ScanBudgetErrorCode` (Convex functions run where `@nordcom/commerce-errors`
 * is off the bundle surface).
 */
export const ChecksumErrorCode = {
    /** A value of a type with no canonical JSON form (function, symbol, bigint) reached the canonicalizer. */
    UNSUPPORTED_VALUE: 'RECONCILE_CHECKSUM_UNSUPPORTED_VALUE',
} as const;

/**
 * Renders a number in its canonical form. ECMAScript's Number-to-String conversion is fully specified
 * (shortest round-trip decimal), so `String(value)` is byte-identical across engines — the property
 * that lets the Convex isolate and the Node-side ETL scripts hash the same number to the same text.
 * `-0` normalizes to `0` (the two are indistinguishable once stored and re-read), and the non-finite
 * values keep their distinct ECMAScript tokens rather than JSON's lossy `null` so `NaN` can never
 * collide with a genuine `null`.
 *
 * @param value - The number to render.
 * @returns The canonical decimal text.
 */
function canonicalNumber(value: number): string {
    if (Object.is(value, -0)) return '0';
    return String(value);
}

/**
 * Serializes a value into the SINGLE canonical JSON text both reconciliation sides hash — the
 * byte-level contract that makes a Mongo-derived expected checksum comparable to a Convex-computed
 * actual checksum. Canonicalization rules (every rule is load-bearing for cross-side determinism):
 *
 * - **Objects:** keys sorted by UTF-16 code units; entries whose value is `undefined` are DROPPED, so
 *   an absent optional field and an omitted field canonicalize identically.
 * - **Arrays:** element order preserved (array order is content); `undefined` holes render as `null`,
 *   matching `JSON.stringify`'s array semantics.
 * - **Numbers:** rendered via {@link canonicalNumber} (deterministic shortest round-trip, `-0` → `0`,
 *   non-finite values keep distinct tokens).
 * - **Strings:** `JSON.stringify` escaping (fully specified by ECMA-404 + ECMA-262).
 * - **`null` / booleans:** literal tokens.
 *
 * Volatile-field handling is deliberately the CALLER's job: the canonicalizer hashes exactly what it
 * is given, and the per-collection logical-document builders (`convex/reconcile.ts` and
 * `scripts/etl/reconcile/checksum.ts`) strip `_id`/`_creationTime` and map id references to stable
 * identities BEFORE canonicalizing.
 *
 * @param value - The value to canonicalize.
 * @returns The canonical JSON text.
 * @throws {ConvexError} `RECONCILE_CHECKSUM_UNSUPPORTED_VALUE` for functions, symbols, and bigints.
 */
export function canonicalJson(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'boolean':
            return value ? 'true' : 'false';
        case 'number':
            return canonicalNumber(value);
        case 'object': {
            if (Array.isArray(value)) {
                return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
            }
            const entries = Object.entries(value as Record<string, unknown>)
                .filter(([, nested]) => nested !== undefined)
                .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
                .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`);
            return `{${entries.join(',')}}`;
        }
        default:
            throw new ConvexError({
                code: ChecksumErrorCode.UNSUPPORTED_VALUE,
                message: `Cannot canonicalize a ${typeof value} for checksumming.`,
            });
    }
}

/**
 * SHA-256 of a UTF-8 text as lowercase hex, via Web Crypto's `crypto.subtle` — the one digest API
 * available in BOTH runtimes this core runs in (the Convex isolate, which has no `node:crypto`, and
 * Node ≥ 20, where `globalThis.crypto` is native), so the two reconciliation sides share one
 * implementation instead of two drift-prone ones.
 *
 * @param text - The text to digest.
 * @returns The 64-character lowercase hex digest.
 */
export async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    let out = '';
    for (const byte of new Uint8Array(digest)) {
        out += byte.toString(16).padStart(2, '0');
    }
    return out;
}

/**
 * Canonical checksum of one logical document: {@link sha256Hex} over {@link canonicalJson}. The unit
 * both reconciliation sides compute per row; equality of two documents' checksums is equality of
 * their canonical forms.
 *
 * @param doc - The logical document (volatile fields already stripped/mapped by the caller).
 * @returns The document's canonical SHA-256 hex checksum.
 * @throws {ConvexError} `RECONCILE_CHECKSUM_UNSUPPORTED_VALUE` when the document holds an uncanonicalizable value.
 */
export async function checksumDocument(doc: Record<string, unknown>): Promise<string> {
    return sha256Hex(canonicalJson(doc));
}

/**
 * Merkle-ish per-collection rollup: SHA-256 over the SORTED per-document checksums joined by `\n`.
 * Sorting makes the rollup independent of scan/transform order (the two sides enumerate documents in
 * unrelated orders), while keeping the per-document hash list the locator for a divergent document —
 * a single differing row changes exactly one list entry, so a set difference of the two lists names
 * it. The empty collection rolls up to the SHA-256 of the empty string, a fixed sentinel both sides
 * agree on.
 *
 * @param docHashes - The collection's per-document checksums, in any order.
 * @returns The collection's rollup checksum.
 */
export async function rollupChecksum(docHashes: readonly string[]): Promise<string> {
    const sorted = [...docHashes].sort();
    return sha256Hex(sorted.join('\n'));
}
