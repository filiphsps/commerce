import React from 'react';

import { UnknownLocaleError } from '@nordcom/commerce-errors';

import type english from '@/i18n/en.json';
import type { CountryCode, CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
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
            return Locale.default;
        }

        return Locale.from(code);
    }

    /**
     * Check if a locale is configured as the default locale.
     *
     * @param {Locale} locale - The locale
     * @returns {boolean} `true` if the locale is the default locale, otherwise `false`.
     */
    static isDefault(locale: Locale = Locale.default): boolean {
        return locale.code === Locale.default.code;
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

            if (!(code as any) || code.length < 2 || code.length > 5 || (code.length !== 2 && !code.includes('-'))) {
                throw new UnknownLocaleError(data);
            }

            if (code.length === 2) {
                return wrap(new Locale({ language: code as LanguageCode, country: undefined }));
            }

            const [language, country] = code.split('-') as [LanguageCode, CountryCode?];
            return wrap(new Locale({ language, country }));
        } else {
            if (!(data as any)) {
                throw new UnknownLocaleError(data);
            }

            const { language, country } = data;
            if ((language as any).length !== 2 || (!!country && (language as any).length !== 2)) {
                throw new UnknownLocaleError(data);
            }

            return wrap(new Locale({ language, country }));
        }
    }
}

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
export const getTranslations = (scope: LocaleDictionaryScope, dictionary?: LocaleDictionary) => {
    return {
        // FIXME: Fix return type.
        t: <T extends LocaleDictionaryKey, L extends TranslationLiteral[]>(
            key: T,
            ...literals: L
        ): string | (string | ReactNode)[] => {
            const string: string = (dictionary as any)?.[scope]?.[key] || key;

            if (((literals as any)?.length || 0) <= 0) {
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

/**
 * Checks if the option name is a size option.
 * @param {string} name - The name of the option.
 * @returns {boolean} `true` if the option is a size option, otherwise `false`.
 */
export const isSizeOption = (name: string): boolean =>
    [
        'size', // English.
        'tamaño', // Spanish.
        'größe', // German.
        'storlek' // Swedish, Norwegian, Danish.
    ].includes(name.toLowerCase());

type CapitalizeOptions = {
    everyWord?: boolean;
    lowerCase?: boolean;
};

/**
 * Capitalize a string.
 *
 * @param {string | ReactNode | ReactNode[]} input - The string to capitalize.
 * @param {CapitalizeOptions} options - The options.
 * @param {boolean} [options.everyWord=false] - Whether to capitalize every word in the string.
 * @param {boolean} [options.lowerCase=true] - Whether to convert the rest of the string to lowercase.
 * @returns {string} The capitalized string.
 */
export function capitalize(
    input: string | ReactNode | ReactNode[],
    { everyWord = false, lowerCase = true }: CapitalizeOptions = {}
): string {
    const string = input?.toString() || '';

    // TODO: Handle ReactNode & ReactNode[].
    if (everyWord) {
        return string
            .split(' ')
            .map((word) => capitalize(word, { lowerCase }))
            .join(' ');
    }

    return string.charAt(0).toUpperCase() + (lowerCase ? string.slice(1).toLowerCase() : string.slice(1));
}
