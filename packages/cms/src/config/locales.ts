// Standalone module — kept free of Payload imports so the env-driven defaults
// can be unit-tested without booting Payload's full config pipeline.
//
// Payload's `localization.locales` is fixed at boot — every locale a tenant
// might want to publish content in must be present here, otherwise the admin
// UI's locale selector won't expose it. Tenants record their own locale list
// per-shop, but the union has to be configured globally.
//
// Default to a generous superset that covers major locales in the formats
// editors commonly use: bare 2-letter (`de`), POSIX-underscore (`de_DE`),
// IETF-hyphen (`de-DE`). Operators can override with NORDCOM_CMS_LOCALES
// (comma-separated) when the default is too narrow or too wide.
const DEFAULT_LOCALE_SUPERSET = [
    // English
    'en', 'en-US', 'en_US', 'en-GB', 'en_GB', 'en-CA', 'en_CA', 'en-AU', 'en_AU',
    // German
    'de', 'de-DE', 'de_DE', 'de-AT', 'de_AT', 'de-CH', 'de_CH',
    // French
    'fr', 'fr-FR', 'fr_FR', 'fr-CA', 'fr_CA', 'fr-BE', 'fr_BE', 'fr-CH', 'fr_CH',
    // Spanish
    'es', 'es-ES', 'es_ES', 'es-MX', 'es_MX', 'es-AR', 'es_AR',
    // Italian
    'it', 'it-IT', 'it_IT',
    // Portuguese
    'pt', 'pt-PT', 'pt_PT', 'pt-BR', 'pt_BR',
    // Nordic
    'sv', 'sv-SE', 'sv_SE',
    'no', 'nb', 'nb-NO', 'nb_NO', 'nn', 'nn-NO', 'nn_NO',
    'da', 'da-DK', 'da_DK',
    'fi', 'fi-FI', 'fi_FI',
    'is', 'is-IS', 'is_IS',
    // Dutch
    'nl', 'nl-NL', 'nl_NL', 'nl-BE', 'nl_BE',
    // Other European
    'pl', 'pl-PL', 'pl_PL',
    'cs', 'cs-CZ', 'cs_CZ',
    'sk', 'sk-SK', 'sk_SK',
    'hu', 'hu-HU', 'hu_HU',
    'ro', 'ro-RO', 'ro_RO',
    'el', 'el-GR', 'el_GR',
    'ru', 'ru-RU', 'ru_RU',
    'uk', 'uk-UA', 'uk_UA',
    'tr', 'tr-TR', 'tr_TR',
    // Asian
    'ja', 'ja-JP', 'ja_JP',
    'ko', 'ko-KR', 'ko_KR',
    'zh', 'zh-CN', 'zh_CN', 'zh-TW', 'zh_TW', 'zh-HK', 'zh_HK',
    // Middle Eastern
    'ar', 'ar-SA', 'ar_SA', 'ar-AE', 'ar_AE',
    'he', 'he-IL', 'he_IL',
];

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

export const resolveCmsLocales = (env: NodeJS.ProcessEnv = process.env): string[] => {
    const fromEnv = parseLocaleEnv(env.NORDCOM_CMS_LOCALES)?.filter(isValidLocale);
    return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_LOCALE_SUPERSET;
};

export const resolveCmsDefaultLocale = (env: NodeJS.ProcessEnv = process.env): string => {
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
