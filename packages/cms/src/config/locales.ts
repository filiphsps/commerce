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

// Permissive locale-string validator: alphanumeric plus `-`/`_`. Lets tenants
// configure regional variants and obscure region codes without us auditing
// every BCP-47 quirk. Rejects only obviously malformed values (whitespace,
// path-traversal characters, leading digits, etc.).
const VALID_LOCALE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,34}$/;
export const isValidLocale = (s: unknown): s is string => typeof s === 'string' && VALID_LOCALE_PATTERN.test(s);

const parseLocaleEnv = (raw: string | undefined): string[] | null => {
    if (!raw) return null;
    const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return parts.length > 0 ? parts : null;
};

/**
 * Every ISO 639-1 base language code (184 entries). Used as the default
 * locale superset so new tenants can publish in any language without a
 * redeploy. Per-tenant scoping happens via `filterAvailableLocales`.
 */
// biome-ignore format: keep grouped by initial letter for readability
export const ISO_639_1_LOCALES: readonly string[] = [
    'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
    'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
    'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
    'da', 'de', 'dv', 'dz',
    'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
    'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
    'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
    'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
    'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
    'ja', 'jv',
    'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
    'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
    'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
    'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
    'oc', 'oj', 'om', 'or', 'os',
    'pa', 'pi', 'pl', 'ps', 'pt',
    'qu',
    'rm', 'rn', 'ro', 'ru', 'rw',
    'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw',
    'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
    'ug', 'uk', 'ur', 'uz',
    've', 'vi', 'vo',
    'wa', 'wo',
    'xh',
    'yi', 'yo',
    'za', 'zh', 'zu',
];

/**
 * Common BCP-47 region-tagged locale codes (`<lang>-<REGION>`) shipped in the
 * default superset alongside the ISO 639-1 bare codes.
 *
 * Tenants store locale codes in `tenant.locales` (e.g. `de-DE`, `fr-FR`,
 * `sv-SE`) and Payload's `localization.locales` must include every code any
 * tenant uses — otherwise Payload's `LocaleProvider` can't resolve the locale
 * from the URL and silently falls back to `defaultLocale`, leaving the locale
 * label and data fetch out of sync with the locale switcher.
 *
 * This list covers major e-commerce markets. Operators with niche regions can
 * extend via `NORDCOM_CMS_LOCALES` (comma-separated env var).
 */
// biome-ignore format: keep grouped by region for readability
export const BCP47_REGION_TAGGED_LOCALES: readonly string[] = [
    // English
    'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ', 'en-IE', 'en-ZA', 'en-IN', 'en-SG', 'en-HK',
    // German
    'de-DE', 'de-AT', 'de-CH', 'de-LU',
    // French
    'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU',
    // Spanish
    'es-ES', 'es-MX', 'es-AR', 'es-CL', 'es-CO', 'es-PE', 'es-VE', 'es-US',
    // Portuguese
    'pt-PT', 'pt-BR',
    // Italian
    'it-IT', 'it-CH',
    // Dutch
    'nl-NL', 'nl-BE',
    // Scandinavian / Nordic
    'sv-SE', 'sv-FI', 'nb-NO', 'nn-NO', 'no-NO', 'da-DK', 'fi-FI', 'is-IS',
    // Slavic
    'pl-PL', 'cs-CZ', 'sk-SK', 'ru-RU', 'uk-UA', 'be-BY',
    'bg-BG', 'hr-HR', 'sr-RS', 'sl-SI', 'mk-MK', 'bs-BA',
    // Baltic
    'lt-LT', 'lv-LV', 'et-EE',
    // Other European
    'hu-HU', 'ro-RO', 'el-GR', 'tr-TR', 'mt-MT', 'sq-AL',
    'ca-ES', 'eu-ES', 'gl-ES',
    'ga-IE', 'cy-GB', 'gd-GB',
    // East Asian
    'zh-CN', 'zh-TW', 'zh-HK', 'zh-SG',
    'ja-JP', 'ko-KR',
    // Southeast Asian
    'th-TH', 'vi-VN', 'id-ID', 'ms-MY', 'tl-PH', 'km-KH', 'lo-LA', 'my-MM',
    // South Asian
    'hi-IN', 'bn-IN', 'bn-BD', 'ta-IN', 'te-IN', 'ml-IN', 'mr-IN',
    'gu-IN', 'pa-IN', 'kn-IN', 'or-IN', 'as-IN', 'si-LK', 'ne-NP', 'ur-PK',
    // Middle East / Iranian
    'ar-EG', 'ar-SA', 'ar-AE', 'ar-MA', 'ar-DZ', 'ar-TN', 'ar-IQ',
    'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-OM', 'ar-QA', 'ar-SY', 'ar-YE',
    'he-IL', 'fa-IR',
    // African
    'sw-KE', 'sw-TZ', 'am-ET', 'ha-NG', 'yo-NG', 'ig-NG',
    'zu-ZA', 'xh-ZA', 'af-ZA',
    // Central Asian / Caucasus
    'hy-AM', 'ka-GE', 'az-AZ', 'kk-KZ', 'ky-KG', 'uz-UZ', 'tg-TJ', 'tk-TM', 'mn-MN',
    // Caribbean
    'ht-HT',
];

// Default superset: every ISO 639-1 base code plus the common BCP-47
// region-tagged variants tenants actually publish in. See module header for
// the rationale — both forms must coexist because tenant.locales stores
// region-tagged codes and Payload won't resolve a locale that isn't here.
const FALLBACK_LOCALES: string[] = [...ISO_639_1_LOCALES, ...BCP47_REGION_TAGGED_LOCALES];

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

export const resolveCmsDefaultLocale = (env: Record<string, string | undefined> = process.env): string => {
    const candidate = env.NORDCOM_CMS_DEFAULT_LOCALE;
    if (candidate && isValidLocale(candidate)) return candidate;
    return 'en-US';
};

// Computed at module load for the live process so callers can import them
// directly without re-reading env on every reference. Tests should call
// `resolveCmsLocales()` / `resolveCmsDefaultLocale()` directly with a
// custom env to exercise both branches.
export const cmsDefaultLocales: string[] = resolveCmsLocales();
export const cmsDefaultLocale: string = resolveCmsDefaultLocale();
