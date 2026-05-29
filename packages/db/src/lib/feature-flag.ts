/**
 * Key namespace that marks a feature flag as a data-driven page-section toggle. Section flags gate
 * whether a generic, per-shop section renders without a code deploy; the prefix lets the admin UI
 * and key validation recognize them without a separate lookup.
 *
 * Lives in this Mongoose-free leaf module (not `models/feature-flag.ts`) so the CMS collection
 * config and the storefront flag definitions can import it from `@nordcom/commerce-db/lib/feature-flag`
 * without dragging in `db.ts`'s `server-only` import — the same isolation `lib/theme.ts` provides for
 * the theme primitives. The package barrel re-exports it, so `@nordcom/commerce-db` consumers are
 * unaffected.
 *
 * @example
 * ```ts
 * import { SECTION_FLAG_PREFIX } from '@nordcom/commerce-db';
 * const key = `${SECTION_FLAG_PREFIX}hero`; // 'section:hero'
 * ```
 */
export const SECTION_FLAG_PREFIX = 'section:';

/**
 * Discriminator for a feature flag's intent. `behavior` flags toggle application logic; `section`
 * flags gate whether a per-shop page section renders. Absent (`undefined`) on legacy rows, which
 * the platform treats as `behavior` — so adding this field is backward-compatible.
 *
 * @example
 * ```ts
 * import type { FeatureFlagKind } from '@nordcom/commerce-db';
 * const kind: FeatureFlagKind = 'section';
 * ```
 */
export type FeatureFlagKind = 'behavior' | 'section';

/**
 * Builds the namespaced storage key for a section toggle from a bare section id.
 *
 * @param id - The bare section identifier (e.g. `'hero'`), without the `section:` prefix.
 * @returns The namespaced flag key (e.g. `'section:hero'`).
 */
export function sectionFlagKey(id: string): string {
    return `${SECTION_FLAG_PREFIX}${id}`;
}

/**
 * Reports whether a feature flag key is namespaced as a section toggle.
 *
 * @param key - The feature flag key to inspect.
 * @returns `true` when `key` carries the `section:` prefix.
 */
export function isSectionFlagKey(key: string): boolean {
    return key.startsWith(SECTION_FLAG_PREFIX);
}
