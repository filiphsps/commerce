/**
 * Per-field localized buckets, the Convex-native replacement for Payload's `localization` machinery.
 *
 * A localized field does not store a single scalar — it stores a BUCKET, a plain object keyed by
 * BCP-47 locale code (`{ 'en-US': 'Hello', 'de-DE': 'Hallo' }`). A read reassembles the active value
 * by walking the `request locale → shop default → platform default` fallback chain (Payload's
 * `localization.fallback: true` with `defaultLocale: 'en-US'`); the first chain locale whose bucket
 * entry is non-empty wins. A write targets ONLY the active locale's slot, so editing locale B can
 * never disturb locale A.
 *
 * The tenant's default locale anchors the middle of the chain and is read from the unified `shops`
 * row's `i18n.defaultLocale` (UNIFY-03) — there is no separate `tenants` doc. These helpers are pure
 * and field-agnostic: they take the resolved chain and the bucket, so the caller (a `tenantQuery`/
 * `tenantMutation`) owns reading the trusted `shopId` and the shop's default locale.
 */

/**
 * Platform-default locale anchoring the bottom of every fallback chain — the parity of Payload's
 * `localization.defaultLocale`. A read that finds no non-empty bucket entry up the chain falls through
 * to this locale last.
 */
export const PLATFORM_DEFAULT_LOCALE = 'en-US';

/**
 * A per-field localized bucket: one stored value per BCP-47 locale code. Absent keys mean "no value in
 * that locale" and trigger fallback at read time.
 */
export type LocalizedBucket<T = unknown> = Record<string, T>;

/**
 * Server-trusted registry of the TOP-LEVEL localized field names per `cmsDocuments`-backed collection,
 * the Convex parity of the descriptor `localized: true` flag (mirroring `documents.ts`'s
 * `REQUIRED_FIELDS_BY_COLLECTION`). It names exactly the collection members of the frozen 35-field
 * localized set (`packages/cms/src/collections/localized-fields.test.ts`); the `header`/`footer`
 * singletons' deeply nested, array-embedded localized fields use a different storage model and are not
 * `cmsDocuments` rows, so they are intentionally absent here. A collection absent from this map has no
 * localized fields and is reassembled unchanged.
 */
export const CMS_LOCALIZED_FIELDS_BY_COLLECTION: Record<string, readonly string[]> = {
    pages: ['title', 'seo'],
    articles: ['title', 'excerpt', 'body', 'seo'],
    productMetadata: ['descriptionOverride', 'seo'],
    collectionMetadata: ['descriptionOverride', 'seo'],
    media: ['caption'],
};

/**
 * Whether a bucket entry counts as empty for fallback: absent, `null`, or a blank/whitespace-only
 * string. Every other value (numbers, booleans, arrays, non-empty objects — e.g. a localized `seo`
 * group) counts as present, so the chain stops at it. Mirrors `documents.ts`'s `isFieldEmpty`.
 *
 * @param value - The candidate bucket entry.
 * @returns `true` when the value is missing or a blank string.
 */
export function isLocalizedValueEmpty(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    return false;
}

/**
 * Builds the ordered `request → shop default → platform default` fallback chain, dropping empty/blank
 * codes and de-duplicating while preserving first-seen order (so a request locale equal to the shop
 * default collapses to one entry). The platform default ({@link PLATFORM_DEFAULT_LOCALE}) always
 * anchors the end unless an earlier entry already named it.
 *
 * @param requestLocale - The locale requested by the caller (top priority); omit when none.
 * @param shopDefaultLocale - The tenant's `i18n.defaultLocale` from its `shops` row; omit when unset.
 * @param platformDefaultLocale - The platform anchor; defaults to {@link PLATFORM_DEFAULT_LOCALE}.
 * @returns The de-duplicated, ordered list of locale codes to try.
 */
export function buildLocaleFallbackChain(
    requestLocale: string | undefined,
    shopDefaultLocale: string | undefined,
    platformDefaultLocale: string = PLATFORM_DEFAULT_LOCALE,
): string[] {
    const chain: string[] = [];
    for (const candidate of [requestLocale, shopDefaultLocale, platformDefaultLocale]) {
        if (typeof candidate === 'string' && candidate.trim().length > 0 && !chain.includes(candidate)) {
            chain.push(candidate);
        }
    }
    return chain;
}

/**
 * Reads a localized field value by walking the fallback `chain` and returning the first locale whose
 * bucket entry is non-empty ({@link isLocalizedValueEmpty}). Returns `undefined` when the bucket is
 * absent, not a plain object, or empty for every locale in the chain.
 *
 * @typeParam T - The stored per-locale value type.
 * @param bucket - The per-field localized bucket, or `null`/`undefined` when the field is unset.
 * @param chain - The ordered fallback chain from {@link buildLocaleFallbackChain}.
 * @returns The resolved value, or `undefined` when no chain locale carries a non-empty entry.
 */
export function readLocalizedField<T>(
    bucket: LocalizedBucket<T> | null | undefined,
    chain: readonly string[],
): T | undefined {
    if (typeof bucket !== 'object' || bucket === null) return undefined;
    for (const locale of chain) {
        const value = bucket[locale];
        if (!isLocalizedValueEmpty(value)) return value;
    }
    return undefined;
}

/**
 * Returns a NEW bucket with `value` written to `locale` only, leaving every other locale's slot byte
 * for byte intact — the structural guarantee that editing locale B never disturbs locale A. Never
 * mutates the input.
 *
 * @typeParam T - The stored per-locale value type.
 * @param bucket - The existing bucket, or `null`/`undefined` to start a fresh one.
 * @param locale - The active locale code whose slot is written.
 * @param value - The value to store for `locale`.
 * @returns A new bucket carrying every prior locale plus the updated `locale`.
 */
export function writeLocalizedField<T>(
    bucket: LocalizedBucket<T> | null | undefined,
    locale: string,
    value: T,
): LocalizedBucket<T> {
    const base = typeof bucket === 'object' && bucket !== null ? bucket : {};
    return { ...base, [locale]: value };
}

/**
 * Reassembles a `cmsDocuments` serialized `data` map for a single active locale: every localized field
 * named for `collection` ({@link CMS_LOCALIZED_FIELDS_BY_COLLECTION}) is collapsed from its bucket to
 * the chain-resolved value via {@link readLocalizedField}; non-localized fields pass through untouched.
 * Returns a new object and never mutates the input. A field whose bucket resolves to `undefined` is
 * omitted from the result, matching an absent field.
 *
 * @param collection - The document's collection slug, selecting its localized field set.
 * @param data - The document's serialized field map (localized fields hold locale-keyed buckets).
 * @param chain - The ordered fallback chain from {@link buildLocaleFallbackChain}.
 * @returns A new field map with localized fields resolved to their active-locale values.
 */
export function reassembleLocalizedDocument(
    collection: string,
    data: unknown,
    chain: readonly string[],
): Record<string, unknown> {
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const localizedFields = new Set(CMS_LOCALIZED_FIELDS_BY_COLLECTION[collection] ?? []);
    const result: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(record)) {
        if (!localizedFields.has(field)) {
            result[field] = value;
            continue;
        }
        const resolved = readLocalizedField(value as LocalizedBucket | null | undefined, chain);
        if (resolved !== undefined) result[field] = resolved;
    }
    return result;
}

/**
 * Writes a single localized field's active-locale slot inside a `cmsDocuments` serialized `data` map,
 * returning a new `data` object. Only `data[fieldName][locale]` changes; the field's other locales and
 * every sibling field are preserved. Never mutates the input.
 *
 * @param data - The document's serialized field map.
 * @param fieldName - The localized field whose active-locale slot is written.
 * @param locale - The active locale code.
 * @param value - The value to store for `locale`.
 * @returns A new field map with the field's `locale` slot updated.
 */
export function writeLocalizedDocumentField(
    data: unknown,
    fieldName: string,
    locale: string,
    value: unknown,
): Record<string, unknown> {
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const bucket = record[fieldName] as LocalizedBucket | null | undefined;
    return { ...record, [fieldName]: writeLocalizedField(bucket, locale, value) };
}
