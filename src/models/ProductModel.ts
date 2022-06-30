import { PricingModel } from './PricingModel';
import { ProductVariantModel } from './ProductVariantModel';
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

    /**
     * Pricing rules.
     */
    pricing: PricingModel;

    /**
     * SEO.
     */
    seo: {
        title: string;
        description: string;
    };

    vendor: VendorModel;

    /**
     * Product variants.
     */
    variants: ProductVariantModel[];

    /**
     * Product Images.
     */
    images: Array<{
        id: string;
        height: number;
        width: number;
        src: string;

        /**
         * Descriptive alt text for the image.
         */
        alt: string;
    }>;

    /**
     * Product options.
     */
    options?: ProductOptionsType;

    details?: any;
    metadata?: any;
}

export type ProductOptionsType = Array<
    ProductOptionCheckbox | ProductOptionMultiChoice
>;
interface ProductOptionGeneric {
    id: string;
    title: string;
    required: boolean;
}
export interface ProductOptionCheckbox extends ProductOptionGeneric {
    type: 'checkbox';
    default: boolean;
}
export interface ProductOptionMultiChoice extends ProductOptionGeneric {
    type: 'multi_choice';
    default?: string;
    values: Array<{
        id: string;
        title: string;
    }>;
}
