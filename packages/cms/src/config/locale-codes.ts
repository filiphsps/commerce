/**
 * The registered locale-code universe, as PURE data. Split out of `./locales`
 * because that module resolves env-driven defaults at load (`process.env` is
 * absent in the browser and in the Convex isolate), while these arrays are
 * needed by side-effect-free consumers: the editor form's locale-bucket
 * discriminator (client bundle) and the `cms:gen` emitter that mirrors the
 * registry into `packages/convex/convex/cms/localized_paths.ts`.
 */

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

/**
 * The registered locale-code set the G4FIX-02 bucket discriminator consults:
 * a bare key counts as a locale ONLY when it appears here. Region-tagged keys
 * are matched by grammar instead (see `isLocaleBucketKey` in the editor form's
 * `locale-bucket.ts`), so curating new regions into
 * {@link BCP47_REGION_TAGGED_LOCALES} is not required for bucket detection.
 */
export const REGISTERED_LOCALE_CODES: ReadonlySet<string> = new Set([
    ...ISO_639_1_LOCALES,
    ...BCP47_REGION_TAGGED_LOCALES,
]);
