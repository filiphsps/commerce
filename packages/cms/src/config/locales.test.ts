import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_LOCALES_ENV = process.env.NORDCOM_CMS_LOCALES;
const ORIGINAL_DEFAULT_ENV = process.env.NORDCOM_CMS_DEFAULT_LOCALE;

describe('cms localization defaults', () => {
    afterEach(() => {
        if (ORIGINAL_LOCALES_ENV === undefined) delete process.env.NORDCOM_CMS_LOCALES;
        else process.env.NORDCOM_CMS_LOCALES = ORIGINAL_LOCALES_ENV;
        if (ORIGINAL_DEFAULT_ENV === undefined) delete process.env.NORDCOM_CMS_DEFAULT_LOCALE;
        else process.env.NORDCOM_CMS_DEFAULT_LOCALE = ORIGINAL_DEFAULT_ENV;
        vi.resetModules();
    });

    it('falls back to a generous superset that covers IETF and POSIX styles', async () => {
        delete process.env.NORDCOM_CMS_LOCALES;
        vi.resetModules();
        const { cmsDefaultLocales } = await import('./index');
        // Multiple format variations of the same language must coexist so a
        // tenant can pick whichever style they prefer.
        expect(cmsDefaultLocales).toEqual(expect.arrayContaining(['de', 'de-DE', 'de_DE']));
        expect(cmsDefaultLocales).toEqual(expect.arrayContaining(['en', 'en-US', 'en_US']));
        expect(cmsDefaultLocales).toEqual(expect.arrayContaining(['sv', 'sv-SE', 'sv_SE']));
        expect(cmsDefaultLocales).toEqual(expect.arrayContaining(['zh', 'zh-CN', 'zh_CN']));
    });

    it('honours NORDCOM_CMS_LOCALES env override', async () => {
        process.env.NORDCOM_CMS_LOCALES = 'fr,fr-FR,fr_FR,custom-LOCALE';
        vi.resetModules();
        const { cmsDefaultLocales } = await import('./index');
        expect(cmsDefaultLocales).toEqual(['fr', 'fr-FR', 'fr_FR', 'custom-LOCALE']);
    });

    it('drops malformed locale strings from the env override', async () => {
        process.env.NORDCOM_CMS_LOCALES = 'fr, fr-FR, ../etc, fr_FR, with space, fr-XX';
        vi.resetModules();
        const { cmsDefaultLocales } = await import('./index');
        expect(cmsDefaultLocales).toEqual(['fr', 'fr-FR', 'fr_FR', 'fr-XX']);
    });

    it('falls back to en-US when default-locale env is unset', async () => {
        delete process.env.NORDCOM_CMS_DEFAULT_LOCALE;
        vi.resetModules();
        const { cmsDefaultLocale } = await import('./index');
        expect(cmsDefaultLocale).toBe('en-US');
    });

    it('honours NORDCOM_CMS_DEFAULT_LOCALE when valid', async () => {
        process.env.NORDCOM_CMS_DEFAULT_LOCALE = 'de_DE';
        vi.resetModules();
        const { cmsDefaultLocale } = await import('./index');
        expect(cmsDefaultLocale).toBe('de_DE');
    });

    it('rejects malformed default-locale env, falling back to en-US', async () => {
        process.env.NORDCOM_CMS_DEFAULT_LOCALE = '../etc/passwd';
        vi.resetModules();
        const { cmsDefaultLocale } = await import('./index');
        expect(cmsDefaultLocale).toBe('en-US');
    });

    it('isValidLocale accepts IETF + POSIX styles, rejects junk', async () => {
        const { isValidLocale } = await import('./index');
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
