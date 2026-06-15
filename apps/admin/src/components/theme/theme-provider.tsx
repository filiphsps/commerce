'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resolveAppliedTheme, THEME_COOKIE, type ThemePreference } from '@/utils/theme';

/**
 * The theme context surface: the current {@link ThemePreference} and a setter that applies it,
 * mirrors it to the cookie, and (for `'system'`) keeps tracking the OS signal.
 */
export interface ThemeContextValue {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applies a preference to `<html data-theme>`, resolving `'system'` against the live OS signal.
 *
 * @param preference - The preference to apply.
 */
function applyPreference(preference: ThemePreference): void {
    const prefersLight = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.dataset.theme = resolveAppliedTheme(preference, prefersLight);
}

/**
 * Shell-level theme controller. Holds the operator's {@link ThemePreference}, applies it to
 * `<html data-theme>`, mirrors changes to the `admin-theme` cookie (for no-flash SSR), and — while on
 * `'system'` — re-applies when the OS scheme flips. Persistence to the user record is the caller's job
 * (the account toggle calls the server action), keeping this provider serializable from the server
 * layout and decoupled from any one feature.
 *
 * @param props.initialPreference - The server-resolved preference (from the cookie).
 * @param props.children - The app tree.
 */
export function ThemeProvider({
    initialPreference,
    children,
}: {
    initialPreference: ThemePreference;
    children: ReactNode;
}) {
    const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

    useEffect(() => {
        applyPreference(preference);
        if (preference !== 'system') {
            return;
        }
        const media = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => applyPreference('system');
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        applyPreference(next);
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    }, []);

    const value = useMemo<ThemeContextValue>(() => ({ preference, setPreference }), [preference, setPreference]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the theme context.
 *
 * @returns The current preference and its setter.
 * @throws {Error} When called outside a {@link ThemeProvider}.
 */
export function useTheme(): ThemeContextValue {
    const value = useContext(ThemeContext);
    if (!value) {
        throw new Error('useTheme must be used within a ThemeProvider.');
    }
    return value;
}
