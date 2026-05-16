import { describe, expect, it, vi } from 'vitest';
import { ISO_639_1_LOCALES, isValidLocale, resolveCmsDefaultLocale, resolveCmsLocales } from './locales';

describe('cms localization defaults', () => {
    it('falls back to the full ISO 639-1 superset (+en-US) when no env var is set', () => {
        // The default is now a comprehensive locale superset; per-tenant
        // scoping happens at request time via Payload's
        // `filterAvailableLocales` (see `./index.ts`). Tenants can publish
        // in any ISO 639-1 language without a redeploy.
        const locales = resolveCmsLocales({});
        expect(locales).toEqual([...ISO_639_1_LOCALES, 'en-US']);
        expect(locales).toContain('en');
        expect(locales).toContain('de');
        expect(locales).toContain('en-US');
        expect(locales.length).toBe(ISO_639_1_LOCALES.length + 1);
    });

    it('ISO_639_1_LOCALES contains 184 entries with no duplicates', () => {
        expect(ISO_639_1_LOCALES.length).toBe(184);
        expect(new Set(ISO_639_1_LOCALES).size).toBe(ISO_639_1_LOCALES.length);
    });

    it('honours NORDCOM_CMS_LOCALES env override (narrows the superset)', () => {
        const locales = resolveCmsLocales({ NORDCOM_CMS_LOCALES: 'fr,fr-FR,fr_FR,custom-LOCALE' });
        expect(locales).toEqual(['fr', 'fr-FR', 'fr_FR', 'custom-LOCALE']);
    });

    it('drops malformed locale strings from the env override', () => {
        const locales = resolveCmsLocales({
            NORDCOM_CMS_LOCALES: 'fr, fr-FR, ../etc, fr_FR, with space, fr-XX',
        });
        expect(locales).toEqual(['fr', 'fr-FR', 'fr_FR', 'fr-XX']);
    });

    it('warns and falls back to the full superset when env override has no valid entries', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const locales = resolveCmsLocales({ NORDCOM_CMS_LOCALES: '../etc, with space' });
        expect(locales).toEqual([...ISO_639_1_LOCALES, 'en-US']);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('falls back to en-US when default-locale env is unset', () => {
        expect(resolveCmsDefaultLocale({})).toBe('en-US');
    });

    it('honours NORDCOM_CMS_DEFAULT_LOCALE when valid', () => {
        expect(resolveCmsDefaultLocale({ NORDCOM_CMS_DEFAULT_LOCALE: 'de_DE' })).toBe('de_DE');
        expect(resolveCmsDefaultLocale({ NORDCOM_CMS_DEFAULT_LOCALE: 'de-AT' })).toBe('de-AT');
    });

    it('rejects malformed default-locale env, falling back to en-US', () => {
        expect(resolveCmsDefaultLocale({ NORDCOM_CMS_DEFAULT_LOCALE: '../etc/passwd' })).toBe('en-US');
        expect(resolveCmsDefaultLocale({ NORDCOM_CMS_DEFAULT_LOCALE: ' de ' })).toBe('en-US');
    });

    it('isValidLocale accepts IETF + POSIX styles, rejects junk', () => {
        expect(isValidLocale('de')).toBe(true);
        expect(isValidLocale('de-DE')).toBe(true);
        expect(isValidLocale('de_DE')).toBe(true);
        expect(isValidLocale('zh-Hant-HK')).toBe(true);
        expect(isValidLocale('en-001')).toBe(true);
        expect(isValidLocale('')).toBe(false);
        expect(isValidLocale(' de ')).toBe(false);
        expect(isValidLocale('../etc')).toBe(false);
        expect(isValidLocale('1de')).toBe(false);
        expect(isValidLocale(123)).toBe(false);
        expect(isValidLocale(null)).toBe(false);
    });
});
