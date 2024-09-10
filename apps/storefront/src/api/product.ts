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
    productType: string | null;
    descriptionHtml: string;

    variants: {
        edges: Array<{
            node: ProductVariant;
        }>;
        pageInfo: PageInfo;
    };

    originalName?: Metafield | undefined | null;
    nutritionalContent?: Metafield | undefined | null;
    ingredients?: Metafield | undefined | null;
    flavors?: Metafield | undefined | null;

    // Built-in metafields.
    allergen?: Metafield | undefined | null;
} & OmitTypeName<Omit<ShopifyProduct, 'descriptionHtml' | 'variants'>>;

export type ProductFilters = SearchResultItemConnection['productFilters'];

export const createProductSearchParams = ({
    product: { trackingParameters }
}: {
    product: Partial<Product>;
}): string => {
    if (!trackingParameters) {
        return '';
    }

    return new URLSearchParams(trackingParameters).toString();
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
