// Tag segments are joined with ".", so any literal "." in a segment must be encoded.
// We also encode ":" because the qualifier separator uses "::". Beyond those two,
// encodeURIComponent handles the long tail (spaces, slashes, emoji, etc.).

/**
 * Encodes a single cache-key segment so it is safe to join with `.` as a separator; escapes `.`
 * and `:` in addition to the characters `encodeURIComponent` already handles.
 *
 * @param value - Raw segment value — a human-readable label or a numeric identifier.
 * @returns The percent-encoded segment string, safe for use as a dotted-path component.
 * @example
 * ```ts
 * encodeSegment('shop.example.com'); // 'shop%2Eexample%2Ecom'
 * encodeSegment(42);                 // '42'
 * ```
 */
export function encodeSegment(value: string | number): string {
    const str = typeof value === 'number' ? String(value) : value;
    return encodeURIComponent(str).replace(/\./g, '%2E').replace(/:/g, '%3A');
}

/**
 * Combines an ordered list of raw segments into a dotted-path cache tag, encoding each segment
 * before joining so no raw value can break the path structure.
 *
 * @param segments - Ordered raw segment values that together form a cache tag (e.g. namespace, tenant key, entity name).
 * @returns A dotted-path string suitable for use as a tagtree cache tag.
 * @throws {Error} When any segment encodes to an empty string, which would produce an ambiguous tag.
 * @example
 * ```ts
 * joinSegments(['commerce', 'shop.example.com', 'product', '123']);
 * // 'commerce.shop%2Eexample%2Ecom.product.123'
 * ```
 */
export function joinSegments(segments: ReadonlyArray<string | number>): string {
    const out: string[] = [];
    for (const seg of segments) {
        const encoded = encodeSegment(seg);
        if (!encoded) {
            throw new Error(`tagtree: empty segment in tag (segments: ${JSON.stringify(segments)})`);
        }
        out.push(encoded);
    }
    return out.join('.');
}
