/**
 * Defensive extractors for Payload field values.
 *
 * Payload's `localized: true` text fields are stored as `{ <locale>: value }`
 * maps in MongoDB. When `payload.find({ locale })` is given a locale that
 * matches the field's stored locales, the value resolves to a bare string.
 * If the locale doesn't match (the request locale wasn't in the page's
 * authored locales, the fallback chain didn't hit, etc.), the field can
 * come back as the raw `{ <locale>: value }` object — and rendering that
 * with `{block.title}` in JSX prints nothing (React silently renders
 * non-text non-Element objects as empty in production).
 *
 * These helpers normalize whatever Payload hands us into a usable string
 * so block components don't silently disappear when the locale chain
 * misfires. Long-term fix is at the locale-resolution layer (see
 * `packages/cms/src/api/_locale-cast.ts`), but the defensive read here
 * makes the storefront resilient to upstream config drift.
 */

const isPlainRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Coerce a Payload field value to a string. Accepts:
 *   - a bare string (the normal locale-resolved case)
 *   - a `{ locale: value }` map (the locale-didn't-resolve case)
 *   - null / undefined / non-string objects → returns `''`
 *
 * When given a locale map, prefers the matched locale, then any string
 * value in the map (in iteration order — Payload's storage order tracks
 * the locale config order, which puts default first).
 */
export const textOf = (v: unknown, preferredLocale?: string): string => {
    if (typeof v === 'string') return v;
    if (v == null) return '';
    if (!isPlainRecord(v)) return '';

    if (preferredLocale && typeof v[preferredLocale] === 'string') {
        return v[preferredLocale] as string;
    }
    for (const candidate of Object.values(v)) {
        if (typeof candidate === 'string') return candidate;
    }
    return '';
};
