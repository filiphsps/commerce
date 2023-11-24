import type english from '@/i18n/en.json';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';
import { TodoError, UnknownLocaleError } from '@/utils/errors';
import type { CountryCode, CurrencyCode, LanguageCode, WeightUnit } from '@shopify/hydrogen-react/storefront-api-types';
import ConvertUnits from 'convert-units';

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
        return Locale.from(BuildConfig?.i18n?.default || ('en-US' as Code));
    }
    static get current(): Readonly<SerializableLocale> {
        if (typeof window === 'undefined') {
            console.warn('The currently used locale is unavailable, returning the default locale instead.');
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
    // FIXME: Remove `!` when `Locale.from` actually throws.
    // TODO: Fallback should be tenant-specific.
    return (locale ? Locale.from(locale)! : Locale.default).country || ('US' as const);
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
    // FIXME: Remove `!` when `Locale.from` actually throws.
    return (locale ? Locale.from(locale)! : Locale.default).language;
};

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
 * @note If the locale is invalid, the default locale will be used.
 *       the default locale is defined in `Config.i18n.default` and
 *       is not tenant configurable at the moment.
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
        throw new TodoError();
    }

    return Locale.from(code);
};

/**
 * Returns the default locale.
 *
 * @deprecated Use {@link Locale.default} instead.
 *
 * @returns {Locale} `Locale` object.
 */
export const DefaultLocale = (): Locale => {
    return Locale.default;
};

/**
 * Check if a locale is the default locale.
 *
 * @deprecated Use {@link Locale.isDefault} instead.
 * @todo TODO: `defaultLocale` should be tenant configurable.
 *
 * @param {Locale} locale - The locale to check.
 * @returns {boolean} `true` if the locale is the default locale, otherwise `false`.
 */
export const isDefaultLocale = (locale: Locale): boolean => {
    return Locale.isDefault(locale);
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
        switch (unit.toUpperCase()) {
            case 'GRAMS':
                return 'g';
            case 'KILOGRAMS':
                return 'kg';
            case 'OUNCES':
                return 'oz';
            case 'POUNDS':
                return 'lb';

            // TODO: Handle this; which should never possibly actually occur.
            default:
                return 'g';
        }
    };
    // FIXME: Support more than just US here, because apparently there's alot
    //        more countries out there using imperial.
    const metric = locale.country && locale.country.toLowerCase() !== 'us';
    const unit = weightUnitToConvertUnits(weightUnit);
    // TODO: Do this properly.
    const targetUnit = (metric && 'g') || 'oz';

    const res = ConvertUnits(weight).from(unit).to(targetUnit);
    // TODO: Precision should be depending on unit.
    return `${Math.ceil(res)}${targetUnit}`;
};
