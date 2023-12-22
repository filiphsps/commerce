import type { OmitTypeName } from '@/utils/abstract-api';
import type {
    Metafield,
    PageInfo,
    Product as ShopifyProduct,
    ProductVariant as ShopifyVariant
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
