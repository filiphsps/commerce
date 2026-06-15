/**
 * The operator's persisted theme choice. `'system'` follows the OS; `'dark'` pins dark. There is no
 * `'light'` choice yet — the admin has no light token set — but the value space and resolution are
 * light-ready: a `[data-theme="light"]` block is the only missing piece.
 */
export type ThemePreference = 'dark' | 'system';

/**
 * The concrete theme actually applied to `<html data-theme>`. `'light'` is resolvable today (when the
 * preference is `'system'` and the OS prefers light) but visually identical to `'dark'` until light
 * tokens exist.
 */
export type AppliedTheme = 'dark' | 'light';

/** Cookie name mirroring the persisted {@link ThemePreference} for no-flash SSR. */
export const THEME_COOKIE = 'admin-theme';

/** The default preference for an operator who has never chosen. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

/**
 * Narrows an arbitrary cookie/string value to a valid {@link ThemePreference}, falling back to
 * {@link DEFAULT_THEME_PREFERENCE} for anything unrecognized.
 *
 * @param value - The raw value (e.g. a cookie value), possibly absent.
 * @returns A valid theme preference.
 */
export function parseThemePreference(value: string | undefined | null): ThemePreference {
    return value === 'dark' || value === 'system' ? value : DEFAULT_THEME_PREFERENCE;
}

/**
 * Resolves a {@link ThemePreference} to the concrete {@link AppliedTheme}, given whether the system
 * currently prefers light.
 *
 * @param preference - The operator's preference.
 * @param systemPrefersLight - The `prefers-color-scheme: light` signal (only consulted for `'system'`).
 * @returns The theme to apply.
 */
export function resolveAppliedTheme(preference: ThemePreference, systemPrefersLight: boolean): AppliedTheme {
    if (preference === 'dark') {
        return 'dark';
    }
    return systemPrefersLight ? 'light' : 'dark';
}
