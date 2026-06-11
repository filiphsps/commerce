// Standalone module — kept free of Payload imports so the env-driven defaults
// can be unit-tested without booting Payload's full config pipeline.
//
// Payload's `localization.locales` is fixed at boot — every locale a tenant
// might want to publish content in must be present in this list. The admin
// UI's locale selector (and Payload's internal `LocaleProvider`) won't
// recognize anything outside it; codes not in the list fall back to the
// global `defaultLocale` at render time, which breaks the locale label on
// `<FieldLabel>` (e.g. `Title — en-US` even after switching to `de-DE`)
// and silently returns wrong-locale data from `payload.find({ locale })`.
//
// Strategy: ship a comprehensive superset covering both ISO 639-1 bare codes
// (e.g. `de`, `fr`) AND BCP-47 region-tagged variants used by tenants in
// `tenant.locales` (e.g. `de-DE`, `fr-FR`, `sv-SE`). Tenants can publish in
// any of these without a redeploy. Each tenant's `tenant.locales` field then
// narrows the admin's locale picker per request via `filterAvailableLocales`
// — that's the only Payload-supported per-tenant scoping for locales. See
// `buildPayloadConfig` in `./index.ts` for the wiring.
//
// Operators can still override via `NORDCOM_CMS_LOCALES` (comma-separated)
// to narrow the superset — useful for staging environments or single-locale
// deployments. When unset (the default) every editor sees the full superset,
// filtered by their tenant.

const VALID_LOCALE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,34}$/;

/**
 * Guards that an unknown value is a plausible locale code.
 * Accepts alphanumeric codes plus `-`/`_` separators (e.g. `en`, `sv-SE`).
 * The full BCP-47 spec is not enforced — only obviously malformed values
 * (whitespace, path-traversal characters, leading digits) are rejected, so
 * obscure region codes pass without requiring an exhaustive allow-list.
 *
 * @param s - Value to test.
 * @returns `true` when `s` is a string matching the permissive locale pattern.
 *
 * @example
 * isValidLocale('en-US'); // true
 * isValidLocale('  en'); // false
 */
export const isValidLocale = (s: unknown): s is string => typeof s === 'string' && VALID_LOCALE_PATTERN.test(s);

/**
 * Splits a comma-separated locale env var string into a trimmed, non-empty
 * array of locale codes.
 *
 * @param raw - Raw env var value (e.g. `"en-US,de-DE, sv-SE"`).
 * @returns Array of non-empty trimmed tokens, or `null` when the input is
 *   absent or produces no tokens after splitting.
 */
const parseLocaleEnv = (raw: string | undefined): string[] | null => {
    if (!raw) return null;
    const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return parts.length > 0 ? parts : null;
};

// The locale-code arrays live in the side-effect-free `./locale-codes` module
// (this module reads `process.env` at load, which the browser and the Convex
// isolate cannot do); re-exported here so existing importers keep working.
import { BCP47_REGION_TAGGED_LOCALES, ISO_639_1_LOCALES } from './locale-codes';

export { BCP47_REGION_TAGGED_LOCALES, ISO_639_1_LOCALES } from './locale-codes';

// Default superset: every ISO 639-1 base code plus the common BCP-47
// region-tagged variants tenants actually publish in. See module header for
// the rationale — both forms must coexist because tenant.locales stores
// region-tagged codes and Payload won't resolve a locale that isn't here.
const FALLBACK_LOCALES: string[] = [...ISO_639_1_LOCALES, ...BCP47_REGION_TAGGED_LOCALES];

/**
 * Returns the list of locale codes Payload should register at boot.
 * Reads `NORDCOM_CMS_LOCALES` from `env` (comma-separated); falls back to the
 * full {@link ISO_639_1_LOCALES} + {@link BCP47_REGION_TAGGED_LOCALES}
 * superset when the variable is absent or produces no valid entries. Emits a
 * console warning when the variable is set but all tokens fail validation.
 *
 * @param env - Environment variable map; defaults to `process.env`.
 * @returns Non-empty array of locale code strings.
 *
 * @example
 * resolveCmsLocales({ NORDCOM_CMS_LOCALES: 'en-US,sv-SE' }); // ['en-US', 'sv-SE']
 * resolveCmsLocales({}); // full ISO 639-1 + BCP-47 superset
 */
export const resolveCmsLocales = (env: Record<string, string | undefined> = process.env): string[] => {
    const fromEnv = parseLocaleEnv(env.NORDCOM_CMS_LOCALES)?.filter(isValidLocale);
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    if (env.NORDCOM_CMS_LOCALES) {
        // Env var was set but had no valid entries — surface the misconfig
        // instead of silently shipping the full fallback to editors.
        console.warn(
            `[cms] NORDCOM_CMS_LOCALES was set but contained no valid locale codes. Falling back to the full ISO 639-1 superset.`,
        );
    }
    return FALLBACK_LOCALES;
};

/**
 * Returns the default locale code Payload should use when no tenant-specific
 * locale is resolved. Reads `NORDCOM_CMS_DEFAULT_LOCALE` from `env` and
 * validates it with {@link isValidLocale}; falls back to `'en-US'`.
 *
 * @param env - Environment variable map; defaults to `process.env`.
 * @returns A valid locale code string.
 *
 * @example
 * resolveCmsDefaultLocale({ NORDCOM_CMS_DEFAULT_LOCALE: 'sv-SE' }); // 'sv-SE'
 * resolveCmsDefaultLocale({}); // 'en-US'
 */
export const resolveCmsDefaultLocale = (env: Record<string, string | undefined> = process.env): string => {
    const candidate = env.NORDCOM_CMS_DEFAULT_LOCALE;
    if (candidate && isValidLocale(candidate)) return candidate;
    return 'en-US';
};

/**
 * Narrows a boot-time locale list to the subset a single tenant is configured
 * for. Payload's global `localization.locales` array is fixed at boot (the full
 * superset above), so per-tenant scoping happens per request via Payload's
 * `filterAvailableLocales` hook — this is the pure, testable core that hook
 * calls with the active tenant's configured locales.
 *
 * Locales live on the unified `shops` row (Phase-0 / UNIFY-03), not a separate
 * `tenants` doc. Fails OPEN: when the tenant configures no locales, or none of
 * its locales overlap the available list, the full `available` list is returned
 * unchanged rather than leaving the editor with an empty picker.
 *
 * @typeParam TLocale - The available-locale element shape; only its `code` is read.
 * @param available - The boot-time locale options Payload registered.
 * @param tenantLocales - The active tenant's configured locale codes (e.g. from
 *   `shop.i18n`); `undefined`/empty fails open to `available`.
 * @returns The narrowed list, or `available` when narrowing would empty it.
 *
 * @example
 * filterAvailableLocales(
 *   [{ code: 'en-US' }, { code: 'de-DE' }, { code: 'sv-SE' }],
 *   ['de-DE'],
 * ); // [{ code: 'de-DE' }]
 */
export const filterAvailableLocales = <TLocale extends { code: string }>(
    available: readonly TLocale[],
    tenantLocales: readonly string[] | undefined,
): TLocale[] => {
    if (!tenantLocales || tenantLocales.length === 0) return [...available];
    const allowed = new Set(tenantLocales);
    const filtered = available.filter((locale) => allowed.has(locale.code));
    return filtered.length > 0 ? filtered : [...available];
};

/**
 * Default upper bound on how many locale slots a single shred-on-write call may carry per large
 * localized field. Large localized richtext/blocks fields are shredded into one Convex `cms_i18n` side
 * row per `(field, locale)`, each capped at the 1 MiB Convex value limit; this budget keeps the
 * combined pre-shred mutation argument — every shreddable field's whole bucket inline — under Convex's
 * 16 MiB per-call function-argument limit. The Convex shred guard mirrors this value (it cannot import
 * this module, which reads `process.env` at load, into the `process`-less Convex isolate).
 */
export const DEFAULT_MAX_LOCALES_PER_WRITE = 8;

/**
 * Resolves the per-write locale budget Payload's editor should enforce for large localized fields.
 * Reads `NORDCOM_CMS_MAX_LOCALES_PER_WRITE` from `env` (a positive integer); falls back to
 * {@link DEFAULT_MAX_LOCALES_PER_WRITE} when the variable is absent, non-numeric, or non-positive.
 *
 * @param env - Environment variable map; defaults to `process.env`.
 * @returns A positive integer locale budget.
 *
 * @example
 * resolveMaxLocalesPerWrite({ NORDCOM_CMS_MAX_LOCALES_PER_WRITE: '4' }); // 4
 * resolveMaxLocalesPerWrite({}); // 8
 */
export const resolveMaxLocalesPerWrite = (env: Record<string, string | undefined> = process.env): number => {
    const raw = env.NORDCOM_CMS_MAX_LOCALES_PER_WRITE;
    if (raw) {
        const parsed = Number.parseInt(raw.trim(), 10);
        if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_MAX_LOCALES_PER_WRITE;
};

/**
 * Process-level locale superset computed once from `process.env` at module
 * load. Import directly for zero-cost access in non-test code; in tests call
 * {@link resolveCmsLocales} with a custom `env` map to exercise both branches.
 */
export const cmsDefaultLocales: string[] = resolveCmsLocales();

/**
 * Process-level per-write locale budget computed once from `process.env` at module load. Import
 * directly for zero-cost access; in tests call {@link resolveMaxLocalesPerWrite} with a custom `env`.
 */
export const cmsMaxLocalesPerWrite: number = resolveMaxLocalesPerWrite();

/**
 * Process-level default locale computed once from `process.env` at module
 * load. Import directly for zero-cost access in non-test code; in tests call
 * {@link resolveCmsDefaultLocale} with a custom `env` map.
 */
export const cmsDefaultLocale: string = resolveCmsDefaultLocale();
