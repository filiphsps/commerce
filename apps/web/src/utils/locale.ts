import type { CountryCode, CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

import { BuildConfig } from '@/utils/build-config';
import type { StoreModel } from '@/models/StoreModel';

// TODO: This should be tenant configurable.
const defaultLocale = BuildConfig.i18n.default;

export type { CountryCode, CurrencyCode, LanguageCode };

export type Locale = {
    locale: string; // xx-XX
    language: LanguageCode;
    country: CountryCode;
    currency?: CurrencyCode;
};

/***
 * Converts a locale string to a `CountryCode`.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {CountryCode} `CountryCode` string.
 */
export const NextLocaleToCountry = (locale?: string): CountryCode =>
    (locale?.split('-')?.[1] || defaultLocale.split('-')[1]).toUpperCase() as CountryCode;

/***
 * Converts a locale string to a `LanguageCode`.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {LanguageCode} `LanguageCode` string.
 */
export const NextLocaleToLanguage = (locale?: string): LanguageCode =>
    (
        (locale && locale.length === 2 && locale) ||
        locale?.split('-')?.[0] ||
        defaultLocale.split('-')[0]
    ).toUpperCase() as LanguageCode; // TODO: replace `toUpperCase` with `toLowerCase`

/***
 * Converts a locale string to a `CurrencyCode`.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {CurrencyCode} `CurrencyCode` string.
 */
export const NextLocaleToCurrency = ({ country, store }: { country: CountryCode; store: StoreModel }): CurrencyCode =>
    (store?.payment?.countries?.find(({ isoCode }) => isoCode === country)?.currency.isoCode ||
        BuildConfig.i18n.currencies[0]) as CurrencyCode;

/***
 * Converts a locale string to a Locale.
 *
 * > NOTE: If the locale is invalid, the default locale will be used.
 *         the default locale is defined in `Config.i18n.default` and
 *         is not tenant configurable at the moment.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {Locale} `Locale` object.
 */
export const NextLocaleToLocale = (locale?: string): Locale | null => {
    if (
        !locale ||
        locale === 'x-default' ||
        locale.length < 2 ||
        locale.length > 5 ||
        (locale.length > 2 && !locale.includes('-'))
    ) {
        // FIXME: Handle invalid locales in a better way.
        return null;
    }

    if (locale.length === 2) {
        // FIXME: Get default country for a given language.
        throw new Error('Not implemented');
    }

    const country = NextLocaleToCountry(locale);
    const language = NextLocaleToLanguage(locale);
    return {
        locale: `${language.toLowerCase()}-${country}`,
        language,
        country
        // TODO: Add currency.
    };
};

/***
 * Returns the default locale.
 *
 * @returns {Locale} `Locale` object.
 */
export const DefaultLocale = (): Locale => {
    return NextLocaleToLocale(defaultLocale)!;
};

// TODO: Make this a proper type that somehow reads from the dictionary files?
export type LocaleDictionary = {} & any;

/***
 * Returns a translation function for a given scope and dictionary.
 *
 * > NOTE: This is a very simple implementation of a translation function.
 *
 * @param {string} scope - The scope of the translation.
 * @param {LocaleDictionary} dictionary - The dictionary to use for the translation.
 * @returns {({ t: (key: string) => string })} The translation function.
 */
export const useTranslation = (scope: string, dictionary: LocaleDictionary) => {
    return {
        t: (key: string): string => dictionary?.[scope]?.[key] || key
    };
};
