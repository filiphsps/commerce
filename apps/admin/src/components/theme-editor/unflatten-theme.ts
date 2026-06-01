import type { ShopThemeTokens } from '@nordcom/commerce-db/lib/theme';

/**
 * A single flattened form-state value. The Payload editor stores every leaf at
 * a dotted path, so a subtree is a plain record from path → primitive value.
 */
export type FlatThemeFields = Record<string, unknown>;

/**
 * Tests whether a path segment addresses an array index (a run of digits) so
 * the un-flattener materializes an array rather than an object at that level.
 *
 * @param segment - One dotted-path segment (e.g. `colors`, `accents`, `0`).
 * @returns `true` when the segment is a non-negative integer index.
 */
const isIndexSegment = (segment: string): boolean => /^\d+$/.test(segment);

/**
 * Rebuilds a nested {@link ShopThemeTokens} shape from a flat map of dotted
 * `theme.*` paths to leaf values (the form-state representation Payload writes
 * through `useField`). The leading `theme.` root is stripped; numeric segments
 * (`colors.accents.0.type`) materialize arrays so `accents[]` round-trips, and
 * `undefined` leaves are skipped so an unset optional token stays absent rather
 * than pinning a default (`noUncheckedIndexedAccess`-safe at every hop).
 *
 * @param fields - Flat map of dotted paths to values; non-`theme.` keys are ignored.
 * @returns A deep-partial theme object suitable for `resolveTheme`.
 */
export function unflattenTheme(fields: FlatThemeFields): ShopThemeTokens {
    const root: Record<string, unknown> = {};

    for (const [path, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        if (!path.startsWith('theme.')) continue;

        const segments = path.slice('theme.'.length).split('.');
        if (segments.length === 0) continue;

        let cursor: Record<string, unknown> | unknown[] = root;
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (segment === undefined) break;

            const isLeaf = i === segments.length - 1;
            if (isLeaf) {
                if (Array.isArray(cursor)) {
                    cursor[Number(segment)] = value;
                } else {
                    cursor[segment] = value;
                }
                break;
            }

            const next = segments[i + 1];
            const childIsArray = next !== undefined && isIndexSegment(next);

            if (Array.isArray(cursor)) {
                const index = Number(segment);
                let child = cursor[index];
                if (child === undefined || child === null) {
                    child = childIsArray ? [] : {};
                    cursor[index] = child;
                }
                cursor = child as Record<string, unknown> | unknown[];
            } else {
                let child = cursor[segment];
                if (child === undefined || child === null) {
                    child = childIsArray ? [] : {};
                    cursor[segment] = child;
                }
                cursor = child as Record<string, unknown> | unknown[];
            }
        }
    }

    return root as ShopThemeTokens;
}
