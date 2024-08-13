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
    if (!product.tags) {
        return false;
    }

    return product.tags.map((tag) => tag.toLowerCase()).includes('vegan');
};
