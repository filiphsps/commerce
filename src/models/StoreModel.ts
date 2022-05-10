export interface StoreModel {
    name: string;
    title: string;
    description: string;
    logo: {
        src: string;
    };

    favicons?: Array<{
        type: string;
        src: string;
    }>;
    accent: {
        primary: string;
        secondary: string;
    };

    currency: string;
    currencies: Array<string>;

    language: string;
    languages: Array<string>;

    custom_header_tags: string;
    custom_body_tags: string;

    pages?: Array<string>;
    navigation?: Array<any>;
}
