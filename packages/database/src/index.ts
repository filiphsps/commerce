import type {
    CommerceProvider,
    ContentProvider,
    PrismicContentProvider,
    Shop,
    ShopTheme,
    ShopifyCommerceProvider,
    ShopifyContentProvider
} from './shop';

export type {
    CommerceProvider,
    ContentProvider,
    PrismicContentProvider,
    Shop,
    ShopTheme,
    ShopifyCommerceProvider,
    ShopifyContentProvider
};

import { CommerceProviderAuthenticationApi, ShopApi, ShopsApi } from './shop';
export { CommerceProviderAuthenticationApi, ShopApi, ShopsApi };

// TODO: Place these in the correct place.
export type Optional<T extends { [key: string]: unknown }> = { [K in keyof T]?: Nullable<T[K]> };
export type Nullable<T> = T | null;
export type Identifiable = { handle: string };

export type LimitFilters = { limit?: Nullable<number> } | { first?: Nullable<number>; last?: Nullable<number> };
