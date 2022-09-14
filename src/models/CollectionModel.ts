import { ProductModel } from './ProductModel';

export interface CollectionModel {
    id: string;
    handle: string;
    is_brand?: boolean;

    /**
     * SEO.
     */
    seo: {
        title: string;
        description: string;
        keywords: string;
    };

    title: string;
    body?: string;
    bodyHtml?: string;

    image?: {
        id: string;
        alt: string;
        src: string;
        height: number;
        width: number;
    };
    items: Array<ProductModel>;

    metadata?: any;
}
