import '@testing-library/jest-dom/vitest';
import '@testing-library/react';

import { GlobalRegistrator } from '@happy-dom/global-registrator';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, expect, vi } from 'vitest';

GlobalRegistrator.register();
expect.extend(matchers);

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
});

afterAll(() => {
    GlobalRegistrator.unregister();
});

vi.mock('server-only', () => ({}));

vi.mock('@vercel/flags', () => ({
    unstable_flags: vi.fn().mockReturnValue(false),
}));
vi.mock('@vercel/edge-config', () => ({
    get: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/utils/flags', () => ({
    showSearchFilter: vi.fn().mockResolvedValue(false),
    showProductInfoLines: vi.fn().mockResolvedValue(false),
}));

// Mock the `build-config` module as it almost only contains tokens,
// secrets, and other sensitive data (excluding the i18n config which
// should be handled dynamically by the platform in the future).
vi.mock('@/utils/build-config', () => ({
    BuildConfig: {
        i18n: {
            default: 'en-US',
            currencies: ['USD'],
        },
        shopify: {
            storefront_id: 'mock-id',
        },
    },
}));

vi.mock('@nordcom/commerce-db', async () => {
    const { mockShop } = await import('./src/utils/test/fixtures/shop');
    return {
        Shop: {
            findByDomain: vi.fn().mockResolvedValue(mockShop()),
        },
    };
});

// Mock `next/navigation`.
vi.mock('next/navigation', async () => ({
    ...(((await vi.importActual('next/navigation')) as any) || {}),
    usePathname: vi.fn().mockReturnValue(''),
    useRouter: vi.fn().mockReturnValue({
        replace: vi.fn(),
    }),
    useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock('@shopify/hydrogen-react', async () => ({
    ...(((await vi.importActual('@shopify/hydrogen-react')) as any) || {}),
    flattenConnection: vi.fn().mockImplementation((data) => data),
    createStorefrontClient: () => ({
        getStorefrontApiUrl: () => '',
        getPublicTokenHeaders: () => ({}),
    }),
    useCart: vi.fn().mockReturnValue({
        status: 'idle',
    }),
    useShop: vi.fn().mockReturnValue({}),
    useShopifyCookies: vi.fn().mockReturnValue({}),
}));

vi.mock('react', async (importActual) => {
    return {
        ...(((await importActual()) as any) || {}),
        cache: vi.fn().mockImplementation((func) => func),
        Suspense: vi.fn().mockImplementation(({ children }: any) => children),
    };
});

vi.mock('next/cache', async () => {
    return {
        unstable_cache: vi.fn().mockImplementation((func) => func),
    };
});

vi.mock('next/image', () => ({
    default: vi.fn().mockImplementation(({ src, alt, ...props }: any) => {
        const React = require('react');
        return React.createElement('img', { src, alt, ...props });
    }),
}));

window.location = {
    ...((window.location as any) || {}),
    pathname: '/en-US/',
    host: 'staging.demo.nordcom.io',
    href: 'http://staging.demo.nordcom.io/en-US/',
    search: '',
    origin: 'http://staging.demo.nordcom.io',
    protocol: 'http:',
};
