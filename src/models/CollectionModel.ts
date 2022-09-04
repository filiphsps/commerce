import { ProductModel } from './ProductModel';

export interface CollectionModel {
    id: string;
    handle: string;

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
