import { ProductModel } from './ProductModel';

export interface CollectionModel {
    id: string;
    handle: string;

    title: string;
    body?: string;

    items: Array<ProductModel>;

    metadata?: any;
}
