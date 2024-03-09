import prisma from './prisma';
export { prisma };

export { PagesApi } from './page';
export { CommerceProviderAuthenticationApi, ShopApi, ShopsApi } from './shop';
export { RestifyObject } from './utils';

export type {
    CommerceProvider,
    ContentProvider,
    PrismicContentProvider,
    Shop,
    ShopTheme,
    ShopifyCommerceProvider,
    ShopifyContentProvider
} from './shop';

// TODO: Place these in the correct place.
export type Optional<T extends { [key: string]: unknown }> = { [K in keyof T]?: Nullable<T[K]> };
export type Nullable<T> = T | null;
export type Identifiable = { handle: string };

export type LimitFilters = { limit?: Nullable<number> } | { first?: Nullable<number>; last?: Nullable<number> };

type Callback = (...args: any[]) => Promise<any>;
export type CacheUtil = <T extends Callback>(
    cb: T,
    key?: string[],
    options?: {
        revalidate?: number | false;
        tags?: string[];
    }
) => T;
export type TaintUtil = (message: string | undefined, object: any) => void;
