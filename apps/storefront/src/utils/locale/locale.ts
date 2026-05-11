import { UnknownLocaleError } from '@nordcom/commerce-errors';
import type { CountryCode, CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';
import React from 'react';
import type english from '@/i18n/en.json';

export type { CountryCode, CurrencyCode, LanguageCode };
export type Code = `${Lowercase<LanguageCode>}-${CountryCode}` | Lowercase<LanguageCode>;

type SerializableLocale = {
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

    private constructor({ language, country }: { language: LanguageCode; country?: CountryCode }) {
        this.language = language;
        this.country = country;

        if (typeof country !== 'undefined') {
            this.code = `${language.toLowerCase()}-${country.toUpperCase()}` as Code;
        } else {
            this.code = `${language.toLowerCase()}` as Code;
        }
    }

    /**
     * The default locale.
     */
    static get default(): Readonly<SerializableLocale> {
        // Intentional fallback for shop-less contexts (tests, build-time, sitemaps without locale).
        // For shop-aware retry paths, use Locale.fallbackForShop(shop) instead.
        return Locale.from('en-US' as Code);
    }

    /**
     * The default locale for a specific shop, reading shop.i18n.defaultLocale.
     * Use in shop-aware retry paths where the shop is already in scope.
     */
    static fallbackForShop(shop: { i18n?: { defaultLocale?: string } }): Readonly<SerializableLocale> {
        const code = shop.i18n?.defaultLocale;
        if (code) {
            try {
                return Locale.from(code);
            } catch {
                // fall through to en-US
            }
        }
        return Locale.from('en-US' as Code);
    }

    /**
     * Get the current locale.
     */
    static get current(): Readonly<SerializableLocale> {
        if (typeof window === 'undefined') {
            // On the server we cannot read the current request synchronously.
            // Async code that needs the request's locale should call getRequestContext()
            // from @/utils/request-context instead.
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
     * @param locale - The locale
     * @returns `true` if the locale is the default locale, otherwise `false`.
     */
    static isDefault(locale: Locale = Locale.default): boolean {
        return locale.code === Locale.default.code;
    }

    /**
     * Convert data to a `Locale`.
     *
     * @param data - The basis to create the locale from.
     * @returns The immutable locale.
     */
    static from(data: { language: LanguageCode; country?: CountryCode } | Code | string) {
        // We can only pass pure objects to the client.
        const wrap = (locale: Locale) =>
            Object.freeze(Object.fromEntries(Object.entries(locale)) as SerializableLocale);

        if (typeof data === 'string') {
            const code = data.toUpperCase() as Uppercase<Code>;

            if (!code || code.length < 2 || code.length > 5 || (code.length !== 2 && !code.includes('-'))) {
                throw new UnknownLocaleError(data);
            }

            if (code.length === 2) {
                return wrap(new Locale({ language: code as LanguageCode, country: undefined }));
            }

            const [language, country] = code.split('-') as [LanguageCode, CountryCode?];
            return wrap(new Locale({ language, country }));
        } else {
            if (!data) {
                throw new UnknownLocaleError(data);
            }

            const { language, country } = data;
            if (language.length !== 2 || (!!country && language.length !== 2)) {
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
 * @param scope - The scope of the translation.
 * @param dictionary - The dictionary to use for the translation.
 * @returns The translation function.
 */
export const getTranslations = (scope: LocaleDictionaryScope, dictionary?: LocaleDictionary) => {
    return {
        // FIXME: Fix return type.
        t: <T extends LocaleDictionaryKey, L extends TranslationLiteral[]>(key: T, ...literals: L): string => {
            const string: string =
                (dictionary as Record<string, Record<string, string>> | undefined)?.[scope]?.[key] || key;

            if ((literals?.length || 0) <= 0) {
                return string;
            }

            const placeholderRegex = /\{([^}]+)\}/g;
            const parts: (string | ReactNode)[] = [];

            let lastIndex = 0;
            for (const match of string.matchAll(placeholderRegex)) {
                parts.push(string.substring(lastIndex, match.index));
                const index = parseInt(match[1], 10);
                parts.push(literals[index]);
                lastIndex = match.index + match[0].length;
            }
            parts.push(string.substring(lastIndex));

            const partsWithKeys = parts.map((part, index) =>
                React.isValidElement(part) ? { ...{ key: index }, ...part } : part,
            );
            return partsWithKeys.some((part) => React.isValidElement(part))
                ? (partsWithKeys as unknown as string)
                : parts.join('');
        },
    };
};

/**
 * Checks if the option name is a size option.
 * @param name - The name of the option.
 * @returns `true` if the option is a size option, otherwise `false`.
 */
export const isSizeOption = (name: string): boolean =>
    [
        'size', // English.
        'tamaño', // Spanish.
        'größe', // German.
        'storlek', // Swedish, Norwegian, Danish.
    ].includes(name.toLowerCase());

type CapitalizeOptions = {
    everyWord?: boolean;
    lowerCase?: boolean;
};
/**
 *
 * @param string - The string to capitalize.
 * @param options - The options.
 * @param [options.everyWord=false] - Whether to capitalize every word in the string.
 * @param [options.lowerCase=true] - Whether to convert the rest of the string to lowercase.
 * @returns The capitalized string.
 */
export function capitalize(string: string, { everyWord = false, lowerCase = true }: CapitalizeOptions = {}): string {
    if (everyWord) {
        return string
            .split(' ')
            .map((word) => capitalize(word, { lowerCase }))
            .join(' ');
    }

    return string.charAt(0).toUpperCase() + (lowerCase ? string.slice(1).toLowerCase() : string.slice(1));
}
