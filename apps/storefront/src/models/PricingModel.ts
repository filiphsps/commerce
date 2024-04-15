export interface PricingModel {
    currency: string;
    range:
        | {
              min: number;
              max: number;
          }
        | number;
    compare_at_range?:
        | {
              min: number;
              max: number;
          }
        | number;
}
