import { CountryCode } from '@shopify/hydrogen-react/storefront-api-types';

export interface StoreModel {
    id: string;
    name: string;
    description?: string;
    logo: {
        src: string;
    };

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

    currencies: Array<string>;
    languages: Array<string>;
    social: Array<{
        name: string;
        url: string;
        handle: string;
    }>;

    custom_header_tags?: string;
    custom_body_tags?: string;

    block: {
        border_radius: string;
    };

    payment?: {
        methods: string[];
        wallets: string[];
        countries: Array<{
            isoCode: CountryCode;
            name: string;
            currency: {
                isoCode: string;
            };
        }>;
    };
}
