import { describe, expect, it, vi } from 'vitest';
import {
    BCP47_REGION_TAGGED_LOCALES,
    ISO_639_1_LOCALES,
    isValidLocale,
    resolveCmsDefaultLocale,
    resolveCmsLocales,
} from './locales';

describe('cms localization defaults', () => {
    it('falls back to the full ISO 639-1 + BCP-47 region-tagged superset when no env var is set', () => {
        // The default is a comprehensive locale superset combining ISO 639-1
        // bare codes with common BCP-47 region-tagged variants tenants store
        // in `tenant.locales`. Per-tenant scoping happens at request time via
        // Payload's `filterAvailableLocales` (see `./index.ts`). Tenants can
        // publish in any of these locales without a redeploy.
        const locales = resolveCmsLocales({});
        expect(locales).toEqual([...ISO_639_1_LOCALES, ...BCP47_REGION_TAGGED_LOCALES]);
        expect(locales).toContain('en');
        expect(locales).toContain('de');
        expect(locales).toContain('en-US');
        expect(locales).toContain('de-DE');
        expect(locales).toContain('sv-SE');
        expect(locales).toContain('fr-FR');
        expect(locales.length).toBe(ISO_639_1_LOCALES.length + BCP47_REGION_TAGGED_LOCALES.length);
    });

    it('BCP47_REGION_TAGGED_LOCALES has no duplicates and all entries are well-formed BCP-47 codes', () => {
        expect(new Set(BCP47_REGION_TAGGED_LOCALES).size).toBe(BCP47_REGION_TAGGED_LOCALES.length);
        for (const code of BCP47_REGION_TAGGED_LOCALES) {
            expect(code).toMatch(/^[a-z]{2,3}-[A-Z0-9]{2,3}$/);
            expect(isValidLocale(code)).toBe(true);
        }
    });

    it('BCP47_REGION_TAGGED_LOCALES does not overlap ISO_639_1_LOCALES', () => {
        const isoSet = new Set(ISO_639_1_LOCALES);
        for (const code of BCP47_REGION_TAGGED_LOCALES) {
            expect(isoSet.has(code)).toBe(false);
        }
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
        expect(locales).toEqual([...ISO_639_1_LOCALES, ...BCP47_REGION_TAGGED_LOCALES]);
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
