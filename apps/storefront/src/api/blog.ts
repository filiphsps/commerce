import type { OmitTypeName } from '@/utils/abstract-api';
import type { Blog as ShopifyBlog } from '@shopify/hydrogen-react/storefront-api-types';

export type Blog = {
    /** JSON string in the Storefront API's RichText format. */
    description?: string;
} & OmitTypeName<Omit<ShopifyBlog, 'metafields'>>;
