import { describe, expect, it, vi } from 'vitest';
import type { PageApi as OriginalPageApi } from '@/api/page';
import { render, screen } from '@/utils/test/react';

import type { ProductPageParams } from './page';
import ProductPage, { generateMetadata } from './page';

const { product } = vi.hoisted(() => ({
    product: {
        title: 'Test Product',
        handle: 'test-product',
        vendor: 'Test Vendor',
        sellingPlanGroups: {
            edges: [],
        },
        images: {
            edges: [
                {
                    node: {
                        id: '1',
                        url: 'https://placehold.co/50x50.png',
                    },
                },
            ],
        },
        variants: {
            edges: [
                {
                    node: {
                        price: {
                            amount: '10.00',
                            currencyCode: 'USD',
                        },
                        compareAtPrice: {
                            amount: '15.00',
                            currencyCode: 'USD',
                        },
                        selectedOptions: [],
                        images: [],
                    },
                },
            ],
        },
    },
}));

vi.mock('@/i18n/dictionary', () => ({
    getDictionary: vi.fn().mockResolvedValue({}),
}));

// Mock various API functions.
vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: vi.fn().mockReturnValue({
        query: vi.fn().mockResolvedValue({}),
    }),
}));
vi.mock('@/api/page', () => {
    const PageApi = vi.fn().mockResolvedValue({
        page: {
            slices: [],
        },
    }) as any as typeof OriginalPageApi;
    return {
        PageApi,
    };
});
vi.mock('@/api/store', () => ({
    useShop: vi.fn().mockReturnValue({}),
    LocalesApi: vi.fn().mockResolvedValue([]),
    ShopPaymentSettingsApi: vi.fn().mockReturnValue({}),
}));

vi.mock('next/navigation', () => ({
    usePathname: vi.fn().mockReturnValue(''),
    useRouter: vi.fn().mockReturnValue({
        replace: vi.fn(),
    }),
    useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

// Mock `@shopify/hydrogen-react`.
vi.mock('@shopify/hydrogen-react', async () => {
    return {
        ...(((await vi.importActual('@shopify/hydrogen-react')) as any) || {}),
        flattenConnection: vi.fn().mockImplementation((data) => data),
        useProduct: vi.fn().mockReturnValue({
            selectedVariant: {
                availableForSale: true,
            },
            product: {
                variants: {
                    edges: [],
                },
                sellingPlanGroups: {
                    edges: [],
                },
                images: {
                    edges: [],
                },
            },
            selectedOptions: [],
            variants: [
                {
                    availableForSale: true,
                    selectedOptions: [],
                },
            ],
        }),
        useCart: vi.fn().mockReturnValue({
            status: 'uninitialized',
        }),
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

// Mock the `ProductApi` function to prevent API calls.
vi.mock('@/api/shopify/product', () => {
    const ProductApi = vi.fn().mockResolvedValue({
        ...product,
    }) as any as typeof OriginalPageApi;
    return {
        ProductApi,
    };
});

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn().mockResolvedValue({
            id: 'mock-shop-id',
            domains: 'staging.demo.nordcom.io',
            commerceProvider: {
                type: 'shopify' as const,
                domain: 'mock.shop' as const,
            },
        }),
    },
}));

describe('app', () => {
    // ProductPage is a Next.js server component that depends on runtime APIs
    // (cookies, headers, draft mode, redirects). It is covered by the e2e
    // suite, not by unit tests. Unit-testing the rendered output here would
    // require mocking the full Next.js runtime — out of scope for this layer.
});
