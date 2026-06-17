import { gql } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApolloClient } from '@/api/client';

vi.mock('server-only', () => ({}));
vi.mock('@/cache', () => ({
    tenantRootTags: () => ['tenant-root'],
}));

const FULL_PRICE = gql`
    query FullPrice {
        product {
            __typename
            id
            priceRange {
                __typename
                minVariantPrice {
                    __typename
                    amount
                    currencyCode
                }
            }
        }
    }
`;

// A rail that only needs the amount — no currencyCode. This is the partial selection that
// landed on the same Product.priceRange and triggered Apollo's overwrite warning.
const PARTIAL_PRICE = gql`
    query PartialPrice {
        product {
            __typename
            id
            priceRange {
                __typename
                minVariantPrice {
                    __typename
                    amount
                }
            }
        }
    }
`;

describe('createApolloClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('merges partial ProductPriceRange selections without warning or data loss', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const client = createApolloClient({ uri: 'https://example.test/graphql', headers: {} }, {} as OnlineShop);
        const { cache } = client;

        // A full selection lands first (amount + currencyCode)...
        cache.writeQuery({
            query: FULL_PRICE,
            data: {
                product: {
                    __typename: 'Product',
                    id: 'gid://shopify/Product/1',
                    priceRange: {
                        __typename: 'ProductPriceRange',
                        minVariantPrice: { __typename: 'MoneyV2', amount: '90.0', currencyCode: 'CAD' },
                    },
                },
            },
        });

        // ...then a partial one for the SAME product omits currencyCode. Without `merge: true`
        // Apollo would warn and overwrite, dropping the cached currencyCode.
        cache.writeQuery({
            query: PARTIAL_PRICE,
            data: {
                product: {
                    __typename: 'Product',
                    id: 'gid://shopify/Product/1',
                    priceRange: {
                        __typename: 'ProductPriceRange',
                        minVariantPrice: { __typename: 'MoneyV2', amount: '90.0' },
                    },
                },
            },
        });

        const result = cache.readQuery<any>({ query: FULL_PRICE });
        expect(result?.product?.priceRange?.minVariantPrice?.currencyCode).toBe('CAD');

        const mergeWarnings = warn.mock.calls.filter((args) => String(args[0]).includes('merge function'));
        expect(mergeWarnings).toHaveLength(0);
    });
});
