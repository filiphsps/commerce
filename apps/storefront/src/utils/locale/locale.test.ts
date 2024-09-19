import { describe, expect, it } from 'vitest';

import { capitalize, getTranslations, isSizeOption, Locale, usesImperialUnits } from '@/utils/locale';

describe('utils', () => {
    describe('Locale', () => {
        describe('Locale', () => {
            it('should return a locale object', () => {
                expect(Locale.from('en-US')).toEqual({
                    code: 'en-US',
                    locale: 'en-US',
                    language: 'EN',
                    country: 'US'
                });
            });
            it('should return a locale object with a country code', () => {
                expect(Locale.from('en-US').country).toEqual('US');
                expect(Locale.from('en-GB').country).toEqual('GB');
                expect(Locale.from('en-CA').country).toEqual('CA');
                expect(Locale.from('en-AU').country).toEqual('AU');
                expect(Locale.from('en-DE').country).toEqual('DE');
                expect(Locale.from('en-SE').country).toEqual('SE');
                expect(Locale.from('en-ZA').country).toEqual('ZA');
            });
            it('should return a locale object with a language code', () => {
                expect(Locale.from('en-US').language).toEqual('EN');
                expect(Locale.from('en-GB').language).toEqual('EN');
                expect(Locale.from('en-CA').language).toEqual('EN');
                expect(Locale.from('en-AU').language).toEqual('EN');
                expect(Locale.from('de-DE').language).toEqual('DE');
                expect(Locale.from('sv-SE').language).toEqual('SV');
                expect(Locale.from('en-ZA').language).toEqual('EN');
            });
            it('should handle invalid casing', () => {
                expect(Locale.from('en-us').code).toEqual('en-US');
                expect(Locale.from('en-gb').code).toEqual('en-GB');
                expect(Locale.from('en-ca').code).toEqual('en-CA');
                expect(Locale.from('en-au').code).toEqual('en-AU');
                expect(Locale.from('en-de').code).toEqual('en-DE');
                expect(Locale.from('en-se').code).toEqual('en-SE');
                expect(Locale.from('en-za').code).toEqual('en-ZA');
            });
            it('should handle invalid country codes', () => {
                expect(() => Locale.from('invalid')).toThrow();
                expect(() => Locale.from('invalid-code')).toThrow();
                //expect(() => Locale.from('in-va')).toThrow();
            });
        });

        describe('getTranslations', () => {
            it('should return a translation function for a given scope and dictionary', () => {
                const dictionary = {
                    common: {
                        hello: 'Hello',
                        world: 'World'
                    },
                    cart: {
                        welcome: 'Welcome to the homepage'
                    }
                } as any;

                const { t: cartT }: any = getTranslations('cart', dictionary);
                const { t: commonT }: any = getTranslations('common' as any, dictionary);

                expect(cartT('welcome')).toEqual('Welcome to the homepage');
                expect(commonT('hello')).toEqual('Hello');
                expect(commonT('world')).toEqual('World');
                expect(cartT('invalid.key')).toEqual('invalid.key');
            });
        });

        describe('isSizeOption', () => {
            it('should return true if the option is a size option, otherwise false', () => {
                expect(isSizeOption('size')).toBe(true);
                expect(isSizeOption('SIZE')).toBe(true);
                expect(isSizeOption('tamaño')).toBe(true);
                expect(isSizeOption('größe')).toBe(true);
                expect(isSizeOption('storlek')).toBe(true);
                expect(isSizeOption('StOrLek')).toBe(true);
                expect(isSizeOption('invalid')).toBe(false);
                expect(isSizeOption('INVALID')).toBe(false);
                expect(isSizeOption('')).toBe(false);
            });
        });

        describe('Weight', () => {
            describe('usesImperialUnits', () => {
                it('should return true if the locale is in the US, LR or MM', () => {
                    expect(usesImperialUnits(Locale.from('en-US'))).toBe(true);
                    expect(usesImperialUnits(Locale.from('en-LR'))).toBe(true);
                    expect(usesImperialUnits(Locale.from('en-MM'))).toBe(true);
                });

                it('should return false if the locale is in the metric system', () => {
                    expect(usesImperialUnits(Locale.from('en-AU'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-CA'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-DE'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-SE'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-ZA'))).toBe(false);
                });
            });
        });

        describe('capitalize', () => {
            it('should capitalize the first letter of a string', () => {
                expect(capitalize('hello')).toBe('Hello');
                expect(capitalize('HELLO')).toBe('Hello');
            });
            it('should capitalize every word in a string', () => {
                expect(capitalize('hello world', { everyWord: true })).toBe('Hello World');
                expect(capitalize('HELLO WORLD', { everyWord: true })).toBe('Hello World');
            });
            it('should capitalize the first letter of every word in a string', () => {
                expect(capitalize('hello world', { everyWord: true, lowerCase: false })).toBe('Hello World');
                expect(capitalize('HELLO WORLD', { everyWord: true, lowerCase: false })).toBe('HELLO WORLD');
            });
        });
    });
});
