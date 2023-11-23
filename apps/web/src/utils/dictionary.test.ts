import type { DictionaryLanguageCode } from '@/i18n/dictionary';
import { dictionaries, getDictionary } from '@/i18n/dictionary';
import { Locale } from '@/utils/locale';
import { describe, expect, it } from 'vitest';

describe('utils', () => {
    describe('dictionary', () => {
        it('should have a getter for each language code', () => {
            const languageCodes = Object.keys(dictionaries) as DictionaryLanguageCode[];
            languageCodes.forEach((languageCode) => {
                expect(typeof dictionaries[languageCode]).toBe('function');
            });
        });

        it('should return a promise that resolves to a dictionary for each language code', async () => {
            const languageCodes = Object.keys(dictionaries) as DictionaryLanguageCode[];
            for (const languageCode of languageCodes) {
                const dictionary = await dictionaries[languageCode]();
                expect(typeof dictionary).toBe('object');
                expect(typeof dictionary.common).toBe('object');
                expect(typeof dictionary.cart).toBe('object');
                expect(typeof dictionary).toMatchSnapshot();
            }
        });

        it('should return a promise that resolves to a dictionary with the correct keys for each language code', async () => {
            const languageCodes = Object.keys(dictionaries) as DictionaryLanguageCode[];
            for (const languageCode of languageCodes) {
                const dictionary = await dictionaries[languageCode]();
                const keys = Object.keys(dictionary);
                expect(keys).toContain('common');
                expect(keys).toContain('cart');
            }
        });

        it('should return the correct dictionary for a locale', async () => {
            const locale = Locale.from('en-US')!;
            const i18n = await getDictionary(locale);
            expect(typeof i18n).toBe('object');
            expect(typeof i18n.cart).toBe('object');
            expect(typeof i18n.common).toBe('object');
        });

        it('should return an empty object for an invalid locale', async () => {
            const i18n = await getDictionary({} as any);
            expect(i18n).toEqual({});
        });
    });
});
