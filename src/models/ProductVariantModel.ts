import { WeightModel } from './WeightModel';

export interface ProductVariantModel {
    id: string;
    available: boolean;
    title: string;
    sku: string;
    barcode: string;
    pricing: {
        currency: string;
        range: number;
        compare_at_range?: number | null;
    };
    default_image: number;
    options: Array<{
        id: string;
        value: string;
    }>;
    weight: WeightModel;
}
