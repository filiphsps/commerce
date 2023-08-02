import type {
    CountryCode,
    CurrencyCode,
    LanguageCode
} from '@shopify/hydrogen-react/storefront-api-types';

import { Config } from './Config';
import type { StoreModel } from '../models/StoreModel';
import { i18n } from '../../next-i18next.config.cjs';

export type Locale = {
    locale: string; // xx-XX
    language: LanguageCode;
    country: CountryCode;
    currency?: CurrencyCode;
};

export const NextLocaleToCountry = (locale?: string): CountryCode =>
    (
        (locale !== 'x-default' && locale?.split('-')[1]) ||
        i18n.locales[1].split('-')[1]
    ).toUpperCase() as CountryCode;
export const NextLocaleToLanguage = (locale?: string): LanguageCode =>
    (
        (locale !== 'x-default' && locale?.split('-')[0]) ||
        i18n.locales[1].split('-')[0]
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
    const safeLocale = (locale && locale !== 'x-default' && locale) || i18n.locales[1];

    return {
        locale: safeLocale,
        language: NextLocaleToLanguage(locale),
        country: NextLocaleToCountry(locale)
    };
};
