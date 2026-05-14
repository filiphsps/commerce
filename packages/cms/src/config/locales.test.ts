import { describe, expect, it, vi } from 'vitest';
import { isValidLocale, resolveCmsDefaultLocale, resolveCmsLocales } from './locales';

describe('cms localization defaults', () => {
    it('falls back to [en-US] when no env var is set — no default superset', () => {
        // The operator must explicitly opt into every locale. A "common
        // locales" default would clutter the picker with options nobody
        // approved and hide misconfiguration.
        const locales = resolveCmsLocales({});
        expect(locales).toEqual(['en-US']);
    });

    it('honours NORDCOM_CMS_LOCALES env override', () => {
        const locales = resolveCmsLocales({ NORDCOM_CMS_LOCALES: 'fr,fr-FR,fr_FR,custom-LOCALE' });
        expect(locales).toEqual(['fr', 'fr-FR', 'fr_FR', 'custom-LOCALE']);
    });

    it('drops malformed locale strings from the env override', () => {
        const locales = resolveCmsLocales({
            NORDCOM_CMS_LOCALES: 'fr, fr-FR, ../etc, fr_FR, with space, fr-XX',
        });
        expect(locales).toEqual(['fr', 'fr-FR', 'fr_FR', 'fr-XX']);
    });

    it('warns and falls back to [en-US] when env override has no valid entries', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const locales = resolveCmsLocales({ NORDCOM_CMS_LOCALES: '../etc, with space' });
        expect(locales).toEqual(['en-US']);
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
