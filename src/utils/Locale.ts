import type { CountryCode, CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

import { Config } from '@/utils/Config';
import type { StoreModel } from '@/models/StoreModel';

const defaultLocale = Config.i18n.default;

export type { CountryCode, CurrencyCode, LanguageCode };

export type Locale = {
    locale: string; // xx-XX
    language: LanguageCode;
    country: CountryCode;
    currency?: CurrencyCode;
};

// TODO: Make this a proper type that somehow reads from the dictionary files?
export type LocaleDictionary = {} & any;

export const NextLocaleToCountry = (locale?: string): CountryCode =>
    ((locale !== 'x-default' && locale?.split('-')[1]) || defaultLocale.split('-')[1]).toUpperCase() as CountryCode;
export const NextLocaleToLanguage = (locale?: string): LanguageCode =>
    (
        (locale && locale.length === 2 && locale) ||
        (locale !== 'x-default' && locale?.split('-')[0]) ||
        defaultLocale.split('-')[0]
    ).toUpperCase() as LanguageCode; // FIXME: replace `toUpperCase` with `toLowerCase`

interface NextLocaleToCurrencyProps {
    country: CountryCode;
    store: StoreModel;
}
export const NextLocaleToCurrency = ({ country, store }: NextLocaleToCurrencyProps): CurrencyCode =>
    (store?.payment?.countries?.find(({ isoCode }) => isoCode === country)?.currency.isoCode ||
        Config.i18n.currencies[0]) as CurrencyCode;

export const NextLocaleToLocale = (locale?: string): Locale => {
    if (!locale || locale.length !== 5 || locale.split('-').length !== 2)
        return NextLocaleToLocale(Config.i18n.default); // FIXME: Do this properly.

    const safeLocale = (locale && locale !== 'x-default' && locale) || defaultLocale;

    return {
        locale: safeLocale,
        language: NextLocaleToLanguage(locale),
        country: NextLocaleToCountry(locale)
    };
};

export const useTranslation = (scope: string, dictionary: LocaleDictionary) => {
    return {
        t: (key: string): string => dictionary?.[scope]?.[key] || key
    };
};
