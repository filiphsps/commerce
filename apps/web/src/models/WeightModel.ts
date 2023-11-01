export type ShopifyWeightUnit = 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS';
export type WeightUnit = 'g' | 'oz';

export interface WeightModel {
    value: number;
    unit: WeightUnit;
}
