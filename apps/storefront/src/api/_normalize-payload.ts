import 'server-only';

import { cmsDefaultLocales } from '@nordcom/commerce-cms/config';

/**
 * Resolves `{ <locale>: value }` maps that Payload sometimes returns for
 * `localized: true` fields when its per-request locale resolution doesn't
 * line up — e.g. when the field's stored locales drift from the configured
 * `localization.locales`, the fallback chain has nothing to fall back to,
 * or the storefront passes a locale tag (`en-US`) while the field was
 * authored under a bare ISO code (`en`) and vice versa.
 *
 * The proper fix is upstream in the locale chain; this module is the
 * storefront's defense in depth so block components can render
 * `{block.title}` without each block re-implementing the same `unknown
 * → string` coercion ladder.
 *
 * Strategy:
 *   - Walk the document once at the API boundary
 *   - Detect a locale map via "every key is a configured Payload locale"
 *     (single-key objects are NEVER treated as locale maps to avoid
 *     false-positives on `{ id: '…' }` shaped depth=0 relations)
 *   - Pick the requested locale, then its language-only form, then any
 *     non-null value as a last-resort fallback
 *   - Recurse so nested locale maps (e.g. a Lexical richText doc that's
 *     itself wrapped in a locale map) unwrap correctly
 *
 * Cost: one shallow tree walk per CMS response. Page docs are small
 * (a few KB of JSON) so this is negligible compared to the Mongo round
 * trip itself.
 */

// `Set` for O(1) membership checks. Computed once at module load — the
// configured locale list is fixed for the process lifetime.
const LOCALE_SET = new Set<string>(cmsDefaultLocales);

/**
 * Guards against arrays, `null`, and class instances, accepting only plain JS objects.
 *
 * @param v - Value to discriminate; rejects `null`, arrays, and class instances that a bare `typeof v === 'object'` check would accept.
 * @returns `true` only when `v` is a non-null, non-array object literal.
 */
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Heuristic for the locale-map shape Payload returns. Requires at least
 * two keys because single-key objects can be legitimately-shaped data —
 * notably `{ id: '<ObjectId>' }` for an unpopulated relation, where 'id'
 * happens to be the ISO 639-1 code for Indonesian and would otherwise
 * false-positive.
 *
 * @param v - Plain object to inspect.
 * @returns `true` when every key in `v` is a configured Payload locale.
 */
const looksLikeLocaleMap = (v: Record<string, unknown>): boolean => {
    const keys = Object.keys(v);
    if (keys.length < 2) return false;
    for (const k of keys) {
        if (!LOCALE_SET.has(k)) return false;
    }
    return true;
};

/**
 * Selects the best matching value from a locale map, falling back through language code then any non-null value.
 *
 * @param map - A record keyed by locale codes.
 * @param preferred - BCP-47 locale code to resolve first.
 * @returns The value for `preferred`, its language subtag, or any non-null fallback; `null` when all values are absent.
 */
const pickLocaleValue = (map: Record<string, unknown>, preferred: string): unknown => {
    if (preferred in map) return map[preferred];
    // BCP-47 `lang-REGION` → ISO 639-1 `lang`. `en-US` doesn't resolve →
    // try `en`. The split takes the language subtag only.
    const lang = preferred.split('-', 1)[0];
    if (lang && lang in map) return map[lang];
    // Last resort: any non-null value. Better to render *some* locale than
    // an empty string — editors are more likely to notice "wrong language"
    // than "no text" and report the upstream config drift.
    for (const value of Object.values(map)) {
        if (value != null) return value;
    }
    return null;
};

// Counter intended for tests + ad-hoc observability — incremented every
// time the walker actually unwraps a locale map. If this is non-zero in
// production, the upstream locale resolution is misfiring; the workaround
// is masking the bug.
let unwrapCount = 0;

/**
 * Test helper: read how many locale maps the last `normalize*` call unwrapped.
 *
 * @returns The cumulative unwrap count since the last `__resetLocaleUnwrapCount` call.
 */
export const __getLocaleUnwrapCount = (): number => unwrapCount;
/** Test helper: reset the unwrap counter. */
export const __resetLocaleUnwrapCount = (): void => {
    unwrapCount = 0;
};

/**
 * Recursively walks a Payload document value, unwrapping locale maps at each level.
 *
 * @param value - Document fragment to walk.
 * @param locale - BCP-47 locale code to extract when a locale map is encountered.
 * @returns The walked value with all locale maps replaced by the selected locale's value.
 */
const walk = (value: unknown, locale: string): unknown => {
    if (value == null) return value;
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
        // Walk in place where possible — but build a new array if any element
        // changed to avoid mutating the caller's input. The cost of always
        // building is dominated by JSON.stringify-equivalent traversal anyway.
        const out: unknown[] = new Array(value.length);
        for (let i = 0; i < value.length; i++) {
            out[i] = walk(value[i], locale);
        }
        return out;
    }

    if (!isPlainObject(value)) return value;

    if (looksLikeLocaleMap(value)) {
        unwrapCount++;
        return walk(pickLocaleValue(value, locale), locale);
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
        out[k] = walk(v, locale);
    }
    return out;
};

/**
 * Normalize a Payload document or document fragment by resolving any
 * locale-map shapes to the requested locale. Type-preserving: `T` flows
 * through unchanged on the type level.
 *
 * @param value - Document or fragment to normalize.
 * @param locale - BCP-47 locale code used to pick values from locale maps.
 * @returns The normalized document with the same shape as the input.
 */
export const normalizePayloadDoc = <T>(value: T, locale: string): T => walk(value, locale) as T;
