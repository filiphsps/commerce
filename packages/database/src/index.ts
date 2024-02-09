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

import { PagesApi } from './page';
export { PagesApi };

// TODO: Place these in the correct place.
export type Optional<T extends { [key: string]: unknown }> = { [K in keyof T]?: Nullable<T[K]> };
export type Nullable<T> = T | null;
export type Identifiable = { handle: string };

export type LimitFilters = { limit?: Nullable<number> } | { first?: Nullable<number>; last?: Nullable<number> };

/**
 * Convert an object with CamelCase keys to snake case.
 * This is pretty much only useful for converting objects to be sent by the REST API.
 *
 * @param {T} input - input object.
 * @returns {T} Resulting object.
 */
export const RestifyObject = <T>(input: T): T => {
    const CamelCaseToSnakeCase = (input: string): string => {
        return input.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
    };

    if (typeof input !== 'object' || input === null) {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map((item) => RestifyObject(item)) as unknown as T;
    }

    const snakeCaseObject = {} as T;
    for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const snakeCaseKey = CamelCaseToSnakeCase(key);
            snakeCaseObject[snakeCaseKey as keyof T] = RestifyObject(input[key]);
        }
    }

    return snakeCaseObject;
};
