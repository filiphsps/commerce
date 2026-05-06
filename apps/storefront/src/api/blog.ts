import type { Blog as ShopifyBlog } from '@shopify/hydrogen-react/storefront-api-types';
import type { OmitTypeName } from '@/utils/abstract-api';

export type Blog = {
    /** JSON string in the Storefront API's RichText format. */
    description?: string;
} & OmitTypeName<Omit<ShopifyBlog, 'metafields'>>;
