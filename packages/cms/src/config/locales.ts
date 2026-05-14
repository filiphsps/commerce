// Standalone module — kept free of Payload imports so the env-driven defaults
// can be unit-tested without booting Payload's full config pipeline.
//
// Payload's `localization.locales` is fixed at boot — every locale a tenant
// might want to publish content in must be present in this list, otherwise
// the admin UI's locale selector won't expose it.
//
// Locales are configured explicitly via `NORDCOM_CMS_LOCALES` (comma-
// separated). There is intentionally no "default superset" — a default that
// included every common world locale would (a) waste memory and config bytes
// in the Payload admin payload sent to every editor request, (b) clutter the
// locale-picker UI with options nobody on this deployment actually publishes
// in, and (c) hide misconfiguration: an editor seeing `de-DE` as an option
// when the operator never approved it is a bug, not a feature.
//
// When the env var is unset we fall back to `[en-US]` — the absolute minimum
// Payload needs to boot. Operators are expected to either set the env var or
// (future work) wire automatic sync with Shopify so each tenant's locale set
// is reflected here.

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

// Minimum viable fallback. Payload requires at least one entry; `en-US` is
// the safest baseline that's almost certainly going to be present in any
// deployment.
const FALLBACK_LOCALES = ['en-US'];

export const resolveCmsLocales = (env: Record<string, string | undefined> = process.env): string[] => {
    const fromEnv = parseLocaleEnv(env.NORDCOM_CMS_LOCALES)?.filter(isValidLocale);
    if (fromEnv && fromEnv.length > 0) return fromEnv;
    if (env.NORDCOM_CMS_LOCALES) {
        // Env var was set but had no valid entries — surface the misconfig
        // instead of silently shipping the [en-US] fallback to editors.
        console.warn(
            `[cms] NORDCOM_CMS_LOCALES was set but contained no valid locale codes. Falling back to ${JSON.stringify(FALLBACK_LOCALES)}.`,
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
