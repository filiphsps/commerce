import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME_PREFERENCE, parseThemePreference, resolveAppliedTheme } from './theme';

describe('parseThemePreference', () => {
    it('accepts the two valid preferences', () => {
        expect(parseThemePreference('dark')).toBe('dark');
        expect(parseThemePreference('system')).toBe('system');
    });
    it('falls back to the default for anything else', () => {
        expect(parseThemePreference('light')).toBe(DEFAULT_THEME_PREFERENCE);
        expect(parseThemePreference(undefined)).toBe(DEFAULT_THEME_PREFERENCE);
        expect(parseThemePreference(null)).toBe(DEFAULT_THEME_PREFERENCE);
    });
});

describe('resolveAppliedTheme', () => {
    it('pins dark for the dark preference regardless of system', () => {
        expect(resolveAppliedTheme('dark', true)).toBe('dark');
        expect(resolveAppliedTheme('dark', false)).toBe('dark');
    });
    it('follows the system signal for the system preference', () => {
        expect(resolveAppliedTheme('system', true)).toBe('light');
        expect(resolveAppliedTheme('system', false)).toBe('dark');
    });
});
