// Standalone module — kept free of Payload imports so the env-driven defaults
// can be unit-tested without booting Payload's full config pipeline.
//
// Payload's `localization.locales` is fixed at boot — every locale a tenant
// might want to publish content in must be present in this list. The admin
// UI's locale selector won't expose anything outside it. There's no Payload
// API for dynamically adding locales at runtime.
//
// Strategy: ship a comprehensive superset (every ISO 639-1 base code) so
// new tenants never need a redeploy to publish in a new language. Each
// tenant's `tenant.locales` field then narrows the admin's locale picker
// per request via `filterAvailableLocales` — that's the only Payload-
// supported per-tenant scoping for locales. See `buildPayloadConfig` in
// `./index.ts` for the wiring.
//
// `en-US` is kept in the superset alongside the bare codes for backwards
// compatibility with existing tenant data that stores BCP-47 region-tagged
// codes (`en-US`, etc.); Payload accepts any string, so both forms coexist.
//
// Operators can still override via `NORDCOM_CMS_LOCALES` (comma-separated)
// to narrow the superset — useful for staging environments or single-locale
// deployments. When unset (the default) every editor sees the full ISO list,
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

// Default superset: every 639-1 code plus `en-US` for backwards compat with
// tenants whose `tenant.locales` field stores BCP-47 region-tagged codes.
const FALLBACK_LOCALES: string[] = [...ISO_639_1_LOCALES, 'en-US'];

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
