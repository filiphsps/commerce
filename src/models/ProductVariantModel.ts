import { WeightModel } from './WeightModel';

export interface ProductVariantModel {
    id: string;
    available: boolean;
    sku: string;
    title: string;
    pricing: {
        currency: string;
        range: number;
        compare_at_range?: number;
    };
    default_image: number;
    options: Array<{
        id: string;
        value: string;
    }>;
    weight: WeightModel;
}
