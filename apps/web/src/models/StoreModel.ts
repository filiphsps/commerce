import type { Locale } from '@/utils/locale';
import type { CountryCode } from '@shopify/hydrogen-react/storefront-api-types';

type StoreImageModel = {
    src: string;
    alt: string;
    height: number;
    width: number;
};

export interface StoreModel {
    id: string;
    name: string;
    description?: string;

    i18n: {
        locales: Locale[];
    };

    logos: {
        primary?: Partial<StoreImageModel>;
        alternative?: Partial<StoreImageModel>;
    };

    currencies?: Array<string>;

    favicon?: Partial<StoreImageModel>;
    accent: {
        primary: string;
        secondary: string;
    };
    color: {
        primary: string;
        secondary: string;
    };

    social: Array<{
        name: string;
        url: string;
        handle: string;
    }>;

    payment?: {
        methods: string[];
        wallets: string[];
        countries?: Array<{
            isoCode: CountryCode;
            name: string;
            currency: {
                isoCode: string;
            };
        }>;
    };
}
