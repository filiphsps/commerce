import { describe, expect, it } from 'vitest';
import { mockLocale } from '@/utils/test/fixtures/locale';

describe('mockLocale', () => {
    it('returns the default Locale.default when no arg passed', () => {
        const locale = mockLocale();
        expect(locale.code).toBe('en-US');
    });

    it('returns a Locale matching the given code', () => {
        const locale = mockLocale('sv-SE');
        expect(locale.code).toBe('sv-SE');
        expect(locale.language).toBe('SV');
        expect(locale.country).toBe('SE');
    });
});
