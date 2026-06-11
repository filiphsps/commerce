/**
 * Per-field localized buckets on the NATIVE form path (CMSGATE-01). A localized
 * leaf stores a single form-state entry whose value is a plain object keyed by
 * BCP-47 locale code (`{ 'en-US': 'Hello', 'de-DE': 'Hallo' }`). The widget
 * layer projects the active locale's slot in and out of that bucket, so editing
 * locale B can never disturb locale A — the whole bucket rides through the
 * save round-trip untouched except for the active slot.
 *
 * Pure module (no React, no directives): consumed by the form-state flattener,
 * the widget chokepoint (`useEditorField`), and the unit suites.
 */

import { REGISTERED_LOCALE_CODES } from '../../config/locale-codes';

/**
 * Grammar a region-tagged bucket key must match (`en-US`, `sv-SE`). Bare keys
 * are NOT matched by grammar — they must be registered ISO 639-1 codes
 * ({@link REGISTERED_LOCALE_CODES}) — because the bare 2-3-lowercase shape is
 * exactly what content keys like `alt`/`src`/`url` collide with (G4FIX-02).
 */
const REGION_TAGGED_LOCALE_KEY_PATTERN = /^[a-z]{2,3}-[A-Z]{2}$/;

/**
 * A per-field localized bucket: one stored value per BCP-47 locale code. The
 * cms-side mirror of `convex/cms/localization.ts`'s `LocalizedBucket`.
 */
export type LocaleBucket<T = unknown> = Record<string, T>;

/**
 * Whether a single object key counts as a locale code for bucket detection:
 * either a member of the registered locale universe (`config/locale-codes`)
 * or region-tagged per the BCP-47 `<lang>-<REGION>` grammar (which is
 * unambiguous even for regions outside the curated list).
 *
 * @param key - Candidate object key.
 * @returns `true` when the key is a registered or region-tagged locale code.
 */
export function isLocaleBucketKey(key: string): boolean {
    return REGISTERED_LOCALE_CODES.has(key) || REGION_TAGGED_LOCALE_KEY_PATTERN.test(key);
}

/**
 * The G4FIX-02 locale-bucket discriminator: every key must be a REGISTERED (or
 * region-tagged) locale code ({@link isLocaleBucketKey}), and the object must
 * carry multiple slots or a region-tagged single slot (`en-US`). The registry
 * lookup is what kills the verifier's false-positive class — `{ alt, src }`
 * and `{ id, url }` content objects pass the old all-short-lowercase shape
 * test but `alt`/`src`/`url` are not locale codes. Deliberately the same
 * semantics as the Convex read seam's `isLocaleBucket`
 * (`convex/cms/localization.ts`, fed by the generated
 * `convex/cms/localized_paths.ts` registry, since the isolate cannot import
 * this module), so what the editor treats as a bucket the storefront read
 * collapses, and nothing else.
 *
 * Only consulted where the descriptor schema allows a bucket — the widget
 * chokepoint gates on `field.localized` — so the residual ambiguity is limited
 * to legacy plain values at localized paths whose keys are ALL genuine locale
 * codes, which is undecidable by construction.
 *
 * @param value - Candidate leaf value.
 * @returns `true` when the value is a locale-keyed bucket.
 */
export function isLocaleBucketValue(value: unknown): value is LocaleBucket {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.length === 0) return false;
    if (!keys.every(isLocaleBucketKey)) return false;
    return keys.length >= 2 || (keys[0]?.includes('-') ?? false);
}

/**
 * Coerces a localized leaf's stored value to bucket shape. A bucket passes
 * through; an absent value becomes an empty bucket; any other (legacy plain)
 * value is attributed to `defaultLocale` — the tenant's default sits in the
 * middle of every read fallback chain, so the legacy value keeps serving every
 * locale until a locale-specific slot is authored.
 *
 * @param value - The leaf's current stored value.
 * @param defaultLocale - The locale a legacy plain value is attributed to.
 * @returns The value as a bucket; never mutates the input.
 */
export function toLocaleBucket(value: unknown, defaultLocale: string): LocaleBucket {
    if (isLocaleBucketValue(value)) return value;
    if (value === undefined || value === null) return {};
    return { [defaultLocale]: value };
}

/**
 * Reads the active locale's slot out of a localized leaf value. Strict by
 * design: an unset slot reads `undefined` rather than falling back to another
 * locale, so saving never silently copies locale A's content into locale B —
 * read-time fallback belongs to the publish/read seam, not the editor.
 *
 * @param value - The leaf's current stored value (bucket or legacy plain).
 * @param locale - The active editing locale.
 * @param defaultLocale - The locale a legacy plain value is attributed to.
 * @returns The active slot's value, or `undefined` when unset.
 */
export function readLocaleSlot<T>(value: unknown, locale: string, defaultLocale: string): T | undefined {
    const bucket = toLocaleBucket(value, defaultLocale);
    return bucket[locale] as T | undefined;
}

/**
 * Returns a NEW bucket with `slotValue` written to `locale` only, leaving every
 * other locale's slot intact — the structural guarantee that editing locale B
 * never disturbs locale A. A legacy plain `current` is first attributed to
 * `defaultLocale` so it survives the upgrade instead of being overwritten.
 *
 * @param current - The leaf's current stored value (bucket or legacy plain).
 * @param locale - The active editing locale whose slot is written.
 * @param slotValue - The value to store for `locale`.
 * @param defaultLocale - The locale a legacy plain value is attributed to.
 * @returns A new bucket carrying every prior locale plus the updated slot.
 */
export function writeLocaleSlot(
    current: unknown,
    locale: string,
    slotValue: unknown,
    defaultLocale: string,
): LocaleBucket {
    return { ...toLocaleBucket(current, defaultLocale), [locale]: slotValue };
}
