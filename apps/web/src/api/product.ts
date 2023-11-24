import type { OmitTypeName } from '@/utils/abstract-api';
import type {
    PageInfo,
    Product as ShopifyProduct,
    ProductVariant as ShopifyVariant
} from '@shopify/hydrogen-react/storefront-api-types';

export type ProductVariant = {
    metafields: ShopifyVariant['metafields'] | undefined;
} & OmitTypeName<Omit<ShopifyVariant, 'compareAtPriceV2' | 'priceV2' | 'metafields'>>;

export type Product = {
    descriptionHtml: string | undefined;
    variants: {
        edges: Array<{
            node: ProductVariant;
        }>;
        pageInfo: PageInfo;
    } & ShopifyProduct;
} & OmitTypeName<Omit<ShopifyProduct, 'descriptionHtml' | 'variants'>>;
