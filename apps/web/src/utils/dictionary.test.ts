import type { DictionaryLanguageCode } from '@/i18n/dictionary';
import { dictionaries } from '@/i18n/dictionary';
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
    });
});
