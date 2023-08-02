import type {
    CountryCode,
    CurrencyCode,
    LanguageCode
} from '@shopify/hydrogen-react/storefront-api-types';

import { Config } from './Config';
import type { StoreModel } from '../models/StoreModel';

const defaultLocale = Config.i18n.default;

export type Locale = {
    locale: string; // xx-XX
    language: LanguageCode;
    country: CountryCode;
    currency?: CurrencyCode;
};

export const NextLocaleToCountry = (locale?: string): CountryCode =>
    (
        (locale !== 'x-default' && locale?.split('-')[1]) ||
        defaultLocale.split('-')[1]
    ).toUpperCase() as CountryCode;
export const NextLocaleToLanguage = (locale?: string): LanguageCode =>
    (
        (locale !== 'x-default' && locale?.split('-')[0]) ||
        defaultLocale.split('-')[0]
    ).toUpperCase() as LanguageCode;

interface NextLocaleToCurrencyProps {
    country: CountryCode;
    store: StoreModel;
}
export const NextLocaleToCurrency = ({ country, store }: NextLocaleToCurrencyProps): CurrencyCode =>
    (store?.payment?.countries?.find(({ isoCode }) => isoCode === country)?.currency.isoCode ||
        store?.currencies?.[0] ||
        Config.i18n.currencies[0]) as CurrencyCode;

export const NextLocaleToLocale = (locale?: string): Locale => {
    const safeLocale = (locale && locale !== 'x-default' && locale) || defaultLocale;

    return {
        locale: safeLocale,
        language: NextLocaleToLanguage(locale),
        country: NextLocaleToCountry(locale)
    };
};
