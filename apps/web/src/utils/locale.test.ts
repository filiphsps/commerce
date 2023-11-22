import {
    NextLocaleToCountry,
    NextLocaleToCurrency,
    NextLocaleToLanguage,
    NextLocaleToLocale,
    useTranslation
} from '@/utils/locale';

import type { StoreModel } from '@/models/StoreModel';

describe('utils', () => {
    describe('NextLocaleToLocale', () => {
        it('should convert an ISO 639-1 and ISO 3166-1 Alpha-2 string to a the Locale object', () => {
            const locales = [NextLocaleToLocale('en-US')!, NextLocaleToLocale('fr-CA')!, NextLocaleToLocale('es-MX')!];

            expect(locales).toEqual([
                {
                    locale: 'en-US',
                    language: 'EN',
                    country: 'US'
                },
                {
                    locale: 'fr-CA',
                    language: 'FR',
                    country: 'CA'
                },
                {
                    locale: 'es-MX',
                    language: 'ES',
                    country: 'MX'
                }
            ]);
        });

        it.fails('should convert an ISO 639-1 string to a the Locale object', () => {
            const locales = [NextLocaleToLocale('en')!, NextLocaleToLocale('fr')!, NextLocaleToLocale('es')!];

            expect(locales).toEqual([
                {
                    locale: 'en-US',
                    language: 'EN',
                    country: 'US'
                },
                {
                    locale: 'fr-CA',
                    language: 'FR',
                    country: 'CA'
                },
                {
                    locale: 'es-MX',
                    language: 'ES',
                    country: 'MX'
                }
            ]);
        });
    });

    describe('NextLocaleToCountry', () => {
        it('should convert an ISO 639-1 and ISO 3166-1 Alpha-2 string to a CountryCode string', () => {
            const countryCodes = [
                NextLocaleToCountry('en-US')!,
                NextLocaleToCountry('fr-CA')!,
                NextLocaleToCountry('es-MX')!
            ];

            expect(countryCodes).toEqual(['US', 'CA', 'MX']);
        });

        it.fails('should convert an ISO 639-1 string to a CountryCode string', () => {
            const countryCodes = [NextLocaleToCountry('en')!, NextLocaleToCountry('fr')!, NextLocaleToCountry('es')!];

            expect(countryCodes).toEqual(['US', 'FR', 'ES']);
        });

        it.fails('should return null if the locale is invalid', () => {
            const countryCode = NextLocaleToCountry('invalid-locale');

            expect(countryCode).toEqual(null);
        });
    });

    describe('NextLocaleToLanguage', () => {
        it('should convert an ISO 639-1 and ISO 3166-1 Alpha-2 string to a LanguageCode string', () => {
            const languageCodes = [
                NextLocaleToLanguage('en-US'),
                NextLocaleToLanguage('fr-CA'),
                NextLocaleToLanguage('es-MX')
            ];

            expect(languageCodes).toEqual(['EN', 'FR', 'ES']);
        });

        it('should convert an ISO 639-1 string to a LanguageCode string', () => {
            const languageCodes = [NextLocaleToLanguage('en'), NextLocaleToLanguage('fr'), NextLocaleToLanguage('es')];

            expect(languageCodes).toEqual(['EN', 'FR', 'ES']);
        });

        it.fails('should return null if the locale is invalid', () => {
            const languageCode = NextLocaleToLanguage('invalid-locale');

            expect(languageCode).toEqual(null);
        });
    });

    describe('NextLocaleToCurrency', () => {
        it('should convert a locale string to a CurrencyCode string', () => {
            const store = {
                payment: {
                    countries: [
                        {
                            isoCode: 'US',
                            currency: {
                                isoCode: 'USD'
                            }
                        },
                        {
                            isoCode: 'CA',
                            currency: {
                                isoCode: 'CAD'
                            }
                        },
                        {
                            isoCode: 'MX',
                            currency: {
                                isoCode: 'MXN'
                            }
                        }
                    ]
                }
            } as StoreModel;

            const currencyCodes = [
                NextLocaleToCurrency({ country: 'US', store }),
                NextLocaleToCurrency({ country: 'CA', store }),
                NextLocaleToCurrency({ country: 'MX', store })
            ];

            expect(currencyCodes).toEqual(['USD', 'CAD', 'MXN']);
        });

        it('should return the default currency code if the country is not found in the store', () => {
            const store = {
                payment: {
                    countries: [
                        {
                            isoCode: 'US',
                            currency: {
                                isoCode: 'USD'
                            }
                        }
                    ]
                }
            } as StoreModel;

            const currencyCode = NextLocaleToCurrency({ country: 'CA', store });

            expect(currencyCode).toEqual('USD');
        });
    });

    describe('NextLocaleToLocale', () => {
        beforeEach(() => {
            // Suppress console.warn output which occurs when an invalid locale is passed to NextLocaleToLocale
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        it('should convert a locale string to a Locale object', () => {
            const locales = [NextLocaleToLocale('en-US')!, NextLocaleToLocale('fr-CA')!, NextLocaleToLocale('es-MX')!];

            expect(locales).toEqual([
                {
                    locale: 'en-US',
                    language: 'EN',
                    country: 'US'
                },
                {
                    locale: 'fr-CA',
                    language: 'FR',
                    country: 'CA'
                },
                {
                    locale: 'es-MX',
                    language: 'ES',
                    country: 'MX'
                }
            ]);
        });

        it('should return null if the locale is invalid', () => {
            const locale = NextLocaleToLocale('invalid-locale');

            expect(locale).toEqual(null);
        });
    });

    describe('useTranslation', () => {
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

            const { t: cartT }: any = useTranslation('cart', dictionary);
            const { t: commonT }: any = useTranslation('common' as any, dictionary);

            expect(cartT('welcome')).toEqual('Welcome to the homepage');
            expect(commonT('hello')).toEqual('Hello');
            expect(commonT('world')).toEqual('World');
            expect(cartT('invalid.key')).toEqual('invalid.key');
        });
    });
});
