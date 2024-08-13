import type { OmitTypeName } from '@/utils/abstract-api';
import type {
    Metafield,
    PageInfo,
    Product as ShopifyProduct,
    ProductVariant as ShopifyVariant,
    SearchResultItemConnection
} from '@shopify/hydrogen-react/storefront-api-types';

export type ProductVariant = {
    metafields: ShopifyVariant['metafields'] | undefined;
} & OmitTypeName<Omit<ShopifyVariant, 'compareAtPriceV2' | 'priceV2' | 'metafields'>>;

export type Product = ShopifyProduct & {
    descriptionHtml: string | undefined;
    variants: {
        edges: Array<{
            node: ProductVariant;
        }>;
        pageInfo: PageInfo;
    };

    keywords: Metafield;

    allergyInformation: Metafield;
    nutritionalContent: Metafield;

    ingredients: Metafield;
    flavors: Metafield;
} & OmitTypeName<Omit<ShopifyProduct, 'descriptionHtml' | 'variants'>>;

export type ProductFilters = SearchResultItemConnection['productFilters'];

export const createProductSearchParams = ({ product: { trackingParameters } }: { product: Product }): string => {
    // TODO: Hotlink to non-default variants.
    const params = new URLSearchParams(trackingParameters || '');
    return params.toString();
};

export const isProductVegan = (product: Product): boolean => {
    if (product.tags.length <= 0) {
        return false;
    }

    const type = productType(product);
    if (!['confectionary', 'food', 'bags', 'clothing', 'sports'].includes(type)) {
        return false;
    }

    return product.tags.map((tag) => tag.toLowerCase().trim()).includes('vegan');
};

export const isProductConfectionary = (product: Product): boolean => {
    const type = product.productType.toLowerCase().trim();
    const applicableTypes = [
        'bakery',
        'cake',
        'candy',
        'chocolate',
        'confectionary',
        'cookies',
        'dessert',
        'pastry',
        'pie',
        'snack',
        'snacks',
        'sweets'
    ];

    if (applicableTypes.some((t) => type.includes(t))) {
        return true;
    }

    return false;
};

export type ProductType =
    | 'confectionary'
    | 'food'
    | 'accessories'
    | 'bags'
    | 'jewelry'
    | 'watches'
    | 'clothing'
    | 'sports'
    | 'other';
export const productType = (product: Product): ProductType => {
    if (isProductConfectionary(product)) {
        return 'confectionary';
    }

    return 'other';
};
