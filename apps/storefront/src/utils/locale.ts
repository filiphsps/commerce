import React from 'react';

import { TodoError, UnknownLocaleError } from '@nordcom/commerce-errors';

import ConvertUnits from 'convert-units';

import type english from '@/i18n/en.json';
import type { StoreModel } from '@/models/StoreModel';
import type { CountryCode, CurrencyCode, LanguageCode, WeightUnit } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

export type { CountryCode, CurrencyCode, LanguageCode };
export type Code = `${Lowercase<LanguageCode>}-${CountryCode}` | Lowercase<LanguageCode>;

type SerializableLocale = {
    /**
     * @deprecated Use `code` instead.
     */
    locale: Code;

    code: Code;
    language: LanguageCode;
    country?: CountryCode;
};

/**
 * A locale.
 */
export class Locale implements SerializableLocale {
    public code!: Code;
    public language: LanguageCode;
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

        // TODO: Remove `locale` when `locale` is removed from `SerializableLocale`.
        this.locale = this.code;
    }

    /**
     * The default locale.
     *
     * @todo TODO: This should be tenant configurable.
     */
    static get default(): Readonly<SerializableLocale> {
        // FIXME: Don't hardcode `en-US` as the fallback.
        return Locale.from('en-US' as Code);
    }

    /**
     * Get the current locale.
     */
    static get current(): Readonly<SerializableLocale> {
        if (typeof window === 'undefined') {
            // TODO: This should be based on the current shop.
            return Locale.default;
        }

        if (window.locale) {
            return Locale.from(window.locale);
        }

        // Get the locale code from the first path segment.
        const code = window.location.pathname.split('/')[1];
        if (!code) {
            throw new UnknownLocaleError(`Invalid locale: "${code}"`);
        }

        return Locale.from(code);
    }

    /**
     * Check if a locale is configured as the default locale.
     *
     * @param {Locale} locale - The locale
     * @returns {boolean} `true` if the locale is the default locale, otherwise `false`.
     */
    static isDefault(locale: Locale): boolean {
        return locale ? locale.code === Locale.default.code : false;
    }

    /**
     * Convert data to a `Locale`.
     *
     * @param {Code | any} data - The basis to create the locale from.
     * @returns {Locale} The immutable locale.
     */
    static from(data: { language: LanguageCode; country?: CountryCode } | Code | string) {
        // We can only pass pure objects to the client.
        const wrap = (locale: Locale) =>
            Object.freeze(Object.fromEntries(Object.entries(locale)) as SerializableLocale);

        if (typeof data === 'string') {
            const code = data.toUpperCase() as Uppercase<Code>;

            if (!code || code.length < 2 || code.length > 5 || (code.length !== 2 && !code.includes('-'))) {
                throw new UnknownLocaleError(`Invalid locale: "${data}"`);
            }

            if (code.length === 2) {
                return wrap(new Locale({ language: code as LanguageCode }));
            }

            const [language, country] = code.split('-') as [LanguageCode, CountryCode?];
            return wrap(new Locale({ language, country }));
        } else {
            if (!data) throw new UnknownLocaleError(`Invalid locale: "${data}"`);

            const { language, country } = data;
            if (language.length !== 2 || (typeof country !== 'undefined' && language.length !== 2)) {
                throw new UnknownLocaleError(`Invalid locale: "${data}"`);
            }

            return wrap(new Locale({ language, country }));
        }
    }
}

/**
 * Converts a locale string to a `CountryCode`.
 *
 * @deprecated Use {@link Locale.from} instead.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {CountryCode} `CountryCode` string.
 */
export const NextLocaleToCountry = (locale?: string): CountryCode => {
    return (locale ? Locale.from(locale) : Locale.default).country || ('US' as const);
};

/**
 * Converts a locale string to a `LanguageCode`.
 *
 * @deprecated Use {@link Locale.from} instead.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {LanguageCode} `LanguageCode` string.
 */
export const NextLocaleToLanguage = (locale?: string): LanguageCode => {
    return (locale ? Locale.from(locale) : Locale.default).language;
};

/**
 * Converts a locale string to a `CurrencyCode`.
 *
 * @param {string} locale - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {CurrencyCode} `CurrencyCode` string.
 */
export const NextLocaleToCurrency = ({ country, store }: { country: CountryCode; store: StoreModel }): CurrencyCode =>
    (store.payment?.countries?.find(({ isoCode }) => isoCode === country)?.currency.isoCode! || 'USD') as CurrencyCode;

/**
 * Converts a locale string to a Locale.
 *
 * @note If the locale is invalid, the default locale will be used.
 *       the default locale is defined in `Config.i18n.default` and
 *       is not tenant configurable at the moment.
 *
 * @deprecated Use {@link Locale.from} instead.
 *
 * @param {string} code - The `ISO 639-1` + `ISO 3166-1 Alpha-2` or pure `ISO 639-1` locale string.
 * @returns {Locale} `Locale` object.
 */
export const NextLocaleToLocale = (code: string): Locale | null => {
    // Legacy handling.
    if (!code || code.length < 2 || code.length > 5 || (code.length > 2 && !code.includes('-'))) {
        return null;
    }

    // Legacy handling.
    if (code.length === 2) {
        throw new TodoError();
    }

    return Locale.from(code);
};

export type DeepKeys<T> = T extends object
    ? {
          [K in keyof T]-?: K extends string | number ? `${T[K] extends object ? DeepKeys<T[K]> : K}` : never;
      }[keyof T]
    : never;

/**
 * A dictionary, uses `en.json` as the base for type-safety.
 */
export type LocaleDictionary = typeof english;
export type LocaleDictionaryScope = Lowercase<keyof LocaleDictionary>;
export type LocaleDictionaryKey = Lowercase<DeepKeys<LocaleDictionary>>;

type TranslationLiteral = string | number | boolean | ReactNode;
/**
 * Returns a translation function for a given scope and dictionary.
 *
 * > NOTE: This is a very simple implementation of a translation function.
 *
 * @param {string} scope - The scope of the translation.
 * @param {LocaleDictionary} dictionary - The dictionary to use for the translation.
 * @returns {({ t: (key: string, ...literals: TranslationLiteral[]) => string })} The translation function.
 */
export const useTranslation = (scope: LocaleDictionaryScope, dictionary?: LocaleDictionary) => {
    return {
        // FIXME: Fix return type.
        t: <T extends LocaleDictionaryKey, L extends TranslationLiteral[]>(key: T, ...literals: L): string => {
            const string: string = (dictionary as any)?.[scope]?.[key] || key;

            if (!literals || literals.length === 0) {
                return string as string;
            }

            const placeholderRegex = /\{([^}]+)\}/g;
            const parts: (string | ReactNode)[] = [];

            let match;
            let lastIndex = 0;
            while ((match = placeholderRegex.exec(string)) !== null) {
                parts.push(string.substring(lastIndex, match.index));
                const index = parseInt(match[1], 10);
                parts.push(literals[index]);
                lastIndex = match.index + match[0].length;
            }
            parts.push(string.substring(lastIndex));

            const partsWithKeys = parts.map((part, index) =>
                React.isValidElement(part) ? { ...{ key: index }, ...part } : part
            );
            return partsWithKeys.some((part) => React.isValidElement(part)) ? partsWithKeys : (parts.join('') as any);
        }
    };
};

export const ConvertToLocalMeasurementSystem = ({
    locale,
    weight,
    weightUnit
}: {
    locale: Locale;
    weight: number;
    weightUnit: WeightUnit;
}): string => {
    const weightUnitToConvertUnits = (unit: WeightUnit) => {
        switch (unit.toLowerCase()) {
            case 'grams':
                return 'g';
            case 'kilograms':
                return 'kg';
            case 'ounces':
                return 'oz';
            case 'pounds':
                return 'lb';

            // TODO: Handle this; which should never possibly actually occur.
            default: {
                console.warn(`Unknown weight unit: ${unit}, defaulting to grams.`);
                return 'g';
            }
        }
    };
    // TODO: Support more than just US here, because apparently there's a lot
    //        more countries out there using imperial.
    const metric = locale.country ? locale.country.toLowerCase() !== 'us' : true;
    const unit = weightUnitToConvertUnits(weightUnit);

    // TODO: Do this properly.
    const targetUnit = metric ? 'g' : 'oz';

    if (unit !== targetUnit) weight = ConvertUnits(weight).from(unit).to(targetUnit);

    let res = ((Math.round(weight) * 100) / 100).toFixed(metric ? 0 : 2).toString();
    if (res.endsWith('.00')) res = res.slice(0, -3);

    return `${res}${targetUnit}`;
};
