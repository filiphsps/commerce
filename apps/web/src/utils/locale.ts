import type { CountryCode, CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

import type english from '@/i18n/en.json';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';

// TODO: This should be tenant configurable.
const defaultLocale = BuildConfig?.i18n?.default || 'en-US'; // FIXME: Don't hardcode `en-US`.

export type { CountryCode, CurrencyCode, LanguageCode };

type Code = `${Lowercase<LanguageCode>}-${CountryCode}` | Lowercase<LanguageCode>;
type LocaleInstance = {
    /**
     * @deprecated Use `code` instead.
     */
    locale: Code;

    code: Code;
    language: LanguageCode;
    country?: CountryCode;
};

export class Locale implements LocaleInstance {
    public code!: Code;
    public language!: LanguageCode;
    public country?: CountryCode;

    /**
     * @deprecated Use `code` instead.
     */
    public locale!: Code;

    private constructor({ language, country }: { language: LanguageCode; country?: CountryCode }) {
        this.language = language;
        this.country = country;

        if (typeof country !== 'undefined') {
            this.code = `${language.toLowerCase()}-${country.toUpperCase()}` as Code;
        } else {
            this.code = `${language.toLowerCase()}` as Code;
        }

        this.locale = this.code;
    }

    static from(data: { language: LanguageCode; country?: CountryCode } | Code | string) {
        const wrap = (locale: Locale) => Object.freeze(Object.fromEntries(Object.entries(locale)) as LocaleInstance);

        if (typeof data === 'string') {
            const code = data.toUpperCase() as Uppercase<Code>;

            if (!code || code.length < 2 || code.length > 5 || (code.length !== 2 && !code.includes('-'))) {
                return null;
                // FIXME: `throw new UnknownLocaleError();`.
            }

            if (code.length === 2) {
                return wrap(new Locale({ language: code as LanguageCode }));
            }

            const [language, country] = code.split('-') as [LanguageCode, CountryCode?];
            return wrap(new Locale({ language, country }));
        } else {
            const { language, country } = data;

            if (language.length !== 2 || (typeof country !== 'undefined' && language.length !== 2)) {
                return null;
                // FIXME: `throw new UnknownLocaleError();`.
            }

            return wrap(new Locale({ language, country }));
        }
    }
}

/**
 * Converts a locale string to a `CountryCode`.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {CountryCode} `CountryCode` string.
 */
export const NextLocaleToCountry = (locale?: string): CountryCode =>
    (locale?.split('-')?.[1] || defaultLocale.split('-')[1]).toUpperCase() as CountryCode;

/**
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
    ).toUpperCase() as LanguageCode; // TODO: Replace `toUpperCase` with `toLowerCase`.

/**
 * Converts a locale string to a `CurrencyCode`.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {CurrencyCode} `CurrencyCode` string.
 */
export const NextLocaleToCurrency = ({ country, store }: { country: CountryCode; store: StoreModel }): CurrencyCode =>
    (store?.payment?.countries?.find(({ isoCode }) => isoCode === country)?.currency.isoCode ||
        BuildConfig.i18n.currencies[0]) as CurrencyCode;

/**
 * Converts a locale string to a Locale.
 *
 * > NOTE: If the locale is invalid, the default locale will be used.
 *         the default locale is defined in `Config.i18n.default` and
 *         is not tenant configurable at the moment.
 *
 * @deprecated Use {@link Locale.from} instead.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {Locale} `Locale` object.
 */
export const NextLocaleToLocale = (code: string): Locale | null => {
    // Legacy handling.
    if (!code || code.length < 2 || code.length > 5 || (code.length > 2 && !code.includes('-'))) {
        return null;
    }

    // Legacy handling.
    if (code.length === 2) {
        throw new Error('Not implemented');
    }

    const country = NextLocaleToCountry(code);
    const language = NextLocaleToLanguage(code);
    return Locale.from({ language, country });
};

/**
 * Returns the default locale.
 *
 * @returns {Locale} `Locale` object.
 */
export const DefaultLocale = (): Locale => {
    return Locale.from(defaultLocale)!;
};

/**
 * Check if a locale is the default locale.
 *
 * @param {Locale} locale - The locale to check.
 * @returns {boolean} `true` if the locale is the default locale, otherwise `false`.
 */
export const isDefaultLocale = (locale: Locale): boolean => {
    return locale.code === defaultLocale;
};

export type DeepKeys<T> = T extends object
    ? {
          [K in keyof T]-?: K extends string | number ? `${T[K] extends object ? DeepKeys<T[K]> : K}` : never;
      }[keyof T]
    : never;

// Use `english` to get type safety.
export type LocaleDictionary = typeof english;
export type LocaleDictionaryScope = Lowercase<keyof LocaleDictionary>;
export type LocaleDictionaryKey = Lowercase<DeepKeys<LocaleDictionary>>;

/**
 * Returns a translation function for a given scope and dictionary.
 *
 * > NOTE: This is a very simple implementation of a translation function.
 *
 * @param {string} scope - The scope of the translation.
 * @param {LocaleDictionary} dictionary - The dictionary to use for the translation.
 * @returns {({ t: (key: string) => string })} The translation function.
 */
export const useTranslation = (scope: LocaleDictionaryScope, dictionary: LocaleDictionary) => {
    return {
        t: (key: LocaleDictionaryKey): string => (dictionary as any)?.[scope]?.[key] || key
    };
};

// https://stackoverflow.com/questions/47057649/typescript-string-dot-notation-of-nested-object
/* type BreakDownObject<O, R = void> = {
    [K in keyof O as string]: K extends string
        ? R extends string
            ? ObjectDotNotation<O[K], `${R}.${K}`>
            : ObjectDotNotation<O[K], K>
        : never;
};

type ObjectDotNotation<O, R = void> = O extends string
    ? R extends string
        ? R
        : never
    : BreakDownObject<O, R>[keyof BreakDownObject<O, R>]; */

// ObjectDotNotation<typeof dictionary>
