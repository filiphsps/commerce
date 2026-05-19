/**
 * Resolve a BCP-47 locale code to a human-readable label for display in the
 * locale switcher. Uses `Intl.DisplayNames` in the active UI language; falls
 * back to the raw code when the platform doesn't support it or when the
 * lookup returns nothing.
 *
 * - `localeLabel('de', 'en')` → `"German"`
 * - `localeLabel('en-US', 'en')` → `"American English"` (Node ICU dependent)
 * - `localeLabel('zz', 'en')` → `"zz"` (no display name available)
 */
export function localeLabel(code: string, uiLanguage: string): string {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') {
        return code;
    }
    try {
        const dn = new Intl.DisplayNames([uiLanguage], { type: 'language', fallback: 'none' });
        const resolved = dn.of(code);
        return typeof resolved === 'string' && resolved.length > 0 ? resolved : code;
    } catch {
        return code;
    }
}
