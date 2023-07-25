import type { CountryCode } from '@shopify/hydrogen-react/storefront-api-types';

export interface StoreModel {
    id: string;
    name: string;
    description?: string;
    logo: {
        src: string;
    };

    currencies?: Array<string>;

    favicon: {
        src: string;
    };
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
