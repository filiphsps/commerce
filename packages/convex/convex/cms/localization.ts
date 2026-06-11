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

import { CMS_LOCALIZED_PATHS_BY_COLLECTION, CMS_REGISTERED_LOCALE_CODES } from './localized_paths';

/**
 * Platform-default locale anchoring the bottom of every fallback chain — the parity of Payload's
 * `localization.defaultLocale`. A read that finds no non-empty bucket entry up the chain falls through
 * to this locale last.
 */
export const PLATFORM_DEFAULT_LOCALE = 'en-US';

/**
 * The registered locale-code universe as a set, hydrated once from the generated
 * `localized_paths.ts` registry (`pnpm cms:gen` mirrors `@nordcom/commerce-cms`'s
 * `config/locale-codes.ts` here; the isolate cannot import that package).
 */
const REGISTERED_LOCALE_CODES: ReadonlySet<string> = new Set(CMS_REGISTERED_LOCALE_CODES);

/**
 * Grammar a region-tagged bucket key must match (`en-US`, `sv-SE`). Bare keys must instead be
 * registered codes — the bare 2-3-lowercase shape is exactly what content keys like `alt`/`src`/`url`
 * collide with (G4FIX-02).
 */
const REGION_TAGGED_LOCALE_KEY_PATTERN = /^[a-z]{2,3}-[A-Z]{2}$/;

/**
 * The G4FIX-02 locale-bucket discriminator, the Convex mirror of the editor form's
 * `isLocaleBucketValue` (`packages/cms/src/editor/form/locale-bucket.ts`): every key must be a
 * REGISTERED locale code ({@link CMS_REGISTERED_LOCALE_CODES}) or region-tagged per the BCP-47
 * `<lang>-<REGION>` grammar, and the object must carry multiple slots or a region-tagged single slot.
 * The registry lookup kills the verifier's false-positive class — `{ alt, src }` / `{ id, url }`
 * content objects pass an all-short-lowercase shape test, but `alt`/`src`/`url` are not locale codes.
 *
 * Only consulted at SCHEMA-localized paths (the generated {@link CMS_LOCALIZED_PATHS_BY_COLLECTION}
 * for the deep walk, `CMS_LOCALIZED_FIELDS_BY_COLLECTION` for the top-level resolver), where it
 * disambiguates an authored bucket from a legacy plain (HARNESS-12/ETL) value. A locale added only
 * via `NORDCOM_CMS_LOCALES` that is neither in the registered superset nor region-tagged will not be
 * recognized as a bucket key — extend `config/locale-codes.ts` and rerun `pnpm cms:gen` for such
 * deployments.
 *
 * @param value - Candidate localized-field value.
 * @returns `true` when the value is a locale-keyed bucket to resolve through the fallback chain.
 */
export function isLocaleBucket(value: unknown): value is LocalizedBucket {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.length === 0) return false;
    if (!keys.every((key) => REGISTERED_LOCALE_CODES.has(key) || REGION_TAGGED_LOCALE_KEY_PATTERN.test(key))) {
        return false;
    }
    return keys.length >= 2 || (keys[0]?.includes('-') ?? false);
}

/** Per-collection cache of the generated localized path patterns as sets, built lazily. */
const localizedPathSets = new Map<string, ReadonlySet<string>>();

/**
 * The schema-localized path patterns for a collection as a membership set — the descriptor-derived
 * gate the deep read walk consults before any bucket collapse. Patterns come from the generated
 * {@link CMS_LOCALIZED_PATHS_BY_COLLECTION}; array/blocks indices are wildcarded to `*`, matching the
 * walk's normalized path accumulation. An unknown collection yields the empty set (nothing collapses).
 *
 * @param collection - The collection slug.
 * @returns The collection's localized path-pattern set.
 */
export function localizedPathsFor(collection: string): ReadonlySet<string> {
    const cached = localizedPathSets.get(collection);
    if (cached) return cached;
    const built = new Set(CMS_LOCALIZED_PATHS_BY_COLLECTION[collection] ?? []);
    localizedPathSets.set(collection, built);
    return built;
}

/**
 * A per-field localized bucket: one stored value per BCP-47 locale code. Absent keys mean "no value in
 * that locale" and trigger fallback at read time.
 */
export type LocalizedBucket<T = unknown> = Record<string, T>;

/**
 * Server-trusted registry of the TOP-LEVEL localized field names per `cmsDocuments`-backed collection,
 * the Convex parity of the descriptor `localized: true` flag (mirroring `documents.ts`'s
 * `REQUIRED_FIELDS_BY_COLLECTION`). It names exactly the top-level members of the frozen localized
 * set (`packages/cms/src/collections/localized-fields.test.ts`); NESTED localized leaves — the
 * `seo.title`/`seo.description`/`seo.keywords` members since G4FIX-03 dropped whole-group
 * localization, plus the `header`/`footer` singletons' array-embedded fields — are resolved by the
 * deep, path-gated walk in `read.ts` instead. A collection absent from this map has no top-level
 * localized fields and is reassembled unchanged.
 */
export const CMS_LOCALIZED_FIELDS_BY_COLLECTION: Record<string, readonly string[]> = {
    pages: ['title'],
    articles: ['title', 'excerpt', 'body'],
    productMetadata: ['descriptionOverride'],
    collectionMetadata: ['descriptionOverride'],
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
