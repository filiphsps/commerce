import { describe, expect, it } from 'vitest';
import { localeLabel } from './locale-label';

describe('localeLabel', () => {
    it('returns the human-readable language name for a known code', () => {
        // Locale-aware: in `en`, "de" → "German".
        expect(localeLabel('de', 'en')).toBe('German');
    });

    it('handles BCP-47 region tags', () => {
        // "en-US" should resolve to something containing "English" in `en` UI.
        const label = localeLabel('en-US', 'en');
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
        // Some Node ICU builds return "American English", others "English (United States)".
        expect(label.toLowerCase()).toMatch(/english/);
    });

    it('returns the raw code when Intl.DisplayNames returns nothing', () => {
        // 'zz' is a syntactically valid locale identifier but has no display name.
        expect(localeLabel('zz', 'en')).toBe('zz');
    });

    it('returns the raw code when Intl.DisplayNames is unavailable', () => {
        const original = Intl.DisplayNames;
        // @ts-expect-error — deliberately removing the global for this test
        Intl.DisplayNames = undefined;
        try {
            expect(localeLabel('de', 'en')).toBe('de');
        } finally {
            Intl.DisplayNames = original;
        }
    });
});
