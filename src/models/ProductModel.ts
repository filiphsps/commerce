import { VendorModel } from './VendorModel';

export interface ProductModel {
    id: string;
    handle: string;
    sku?: string;

    title: string;
    description?: string;
    body?: any;
    type?: string;
    tags?: string[];

    seo?: {
        title: string;
        description: string;
    };

    vendor: VendorModel;
    producer?: {
        title: string;
        handle: string | null;
    };

    variants: Array<{
        available: boolean;
        position: number;
        items?: number;

        id: string | number;
        type: string;
        title: string;

        sku: string;
        barcode: string | number;
        currency: string;
        vat?: any;

        image: number;
        price: any;
        price_per_item?: any;
        from_price: any;
        compare_at_price: any;
        compare_at_from_price: any;

        packages: any;

        weight: {
            value: number;
            unit: string;
        };

        inventory_quantity: number;
        inventory_policy: string;
    }>;
    images: Array<any>;

    currency?: string;

    details?: any;
    metadata?: any;
}
