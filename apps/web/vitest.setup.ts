import '@testing-library/jest-dom/vitest';
import '@testing-library/react';

import 'next';

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

GlobalRegistrator.register();
expect.extend(matchers);

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

vi.mock('server-only', () => ({}));

// Mock the `build-config` module as it almost only contains tokens,
// secrets, and other sensitive data (excluding the i18n config which
// should be handled dynamically by the platform in the future).
vi.mock('@/utils/build-config', () => ({
    BuildConfig: {
        i18n: {
            default: 'en-US',
            currencies: ['USD']
        },
        shopify: {
            storefront_id: 'mock-id'
        },
        prismic: {
            name: 'mock-repo'
        }
    }
}));

vi.mock('@nordcom/commerce-database', () => ({
    ShopApi: vi.fn().mockResolvedValue({
        id: 'mock-shop-id',
        domain: 'staging.demo.nordcom.io',
        commerceProvider: {
            type: 'shopify' as const,
            domain: 'mock.shop' as const
        }
    })
}));

// Mock the `prismic` module as it requires a valid Prismic repository,
// which we don't have in our tests. It's up to prismic to test their
// service, not us. We would only cause unnecessary conflicts and
// errors by trying to include it in our tests.
vi.mock('@/prismic', () => ({
    createClient: vi.fn().mockReturnValue({
        getSingle: vi.fn().mockResolvedValue({
            data: {}
        })
    })
}));

// Mock `next/navigation`.
vi.mock('next/navigation', async () => {
    return {
        ...((await vi.importActual('next/navigation')) || {}),
        usePathname: vi.fn().mockReturnValue('/en-US/hello-testing-env')
    };
});

vi.mock('@/api/product-reviews', () => ({
    ProductReviewsApi: vi.fn().mockResolvedValue({
        reviews: [],
        averageRating: 5
    })
}));

vi.mock('@shopify/hydrogen-react', async () => ({
    ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
    flattenConnection: vi.fn().mockImplementation((data) => data),
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => '',
        getPublicTokenHeaders: () => ({})
    }),
    useCart: vi.fn().mockReturnValue({}),
    useShop: vi.fn().mockReturnValue({}),
    useShopifyCookies: vi.fn().mockReturnValue({})
}));

vi.mock('react', async () => {
    return {
        ...((await vi.importActual('react')) || {}),
        cache: vi.fn().mockImplementation((func) => func)
    };
});
vi.mock('next/cache', async () => {
    return {
        unstable_cache: vi.fn().mockImplementation((func) => func)
    };
});

window.location = {
    ...(window.location || {}),
    pathname: '/en-US/',
    host: 'staging.demo.nordcom.io',
    href: 'http://staging.demo.nordcom.io/en-US/',
    search: '',
    origin: 'http://staging.demo.nordcom.io',
    protocol: 'http:'
};
