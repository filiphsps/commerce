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
    // The theme module is pure (no Mongoose/db side effects), so pull in its real
    // `resolveTheme` / `THEME_DEFAULTS` / `FONT_FAMILIES` exports rather than stubbing them — the
    // CSS-variable serializer and font loader depend on the genuine default-resolution behavior.
    const theme = await vi.importActual<typeof import('@nordcom/commerce-db/lib/theme')>(
        '@nordcom/commerce-db/lib/theme',
    );
    return {
        ...theme,
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
    // next/image accepts framework-only props (`priority`, `unoptimized`,
    // `loader`, `placeholder`, `blurDataURL`, `fill`, `sizes`, `quality`) that
    // are not valid DOM attributes — strip them before forwarding to <img>.
    default: vi
        .fn()
        .mockImplementation(
            ({
                src,
                alt,
                priority,
                unoptimized,
                loader,
                placeholder,
                blurDataURL,
                fill,
                sizes,
                quality,
                ...props
            }: any) => {
                const React = require('react');
                return React.createElement('img', { src, alt, ...props });
            },
        ),
}));

// next-auth@5-beta's lib/env.js does `import "next/server"` without the
// `.js` extension, which Node's strict ESM resolver rejects under Vitest.
// The bare `next-auth` import in `@/auth` and the React entry both pull
// that file in, so stub both surfaces. Individual suites override per-file.
vi.mock('next-auth', () => ({
    default: vi.fn().mockReturnValue({
        auth: vi.fn().mockResolvedValue(null),
        handlers: { GET: vi.fn(), POST: vi.fn() },
        signIn: vi.fn(),
        signOut: vi.fn(),
    }),
}));

vi.mock('next-auth/react', async () => {
    const { createContext } = (await vi.importActual('react')) as typeof import('react');
    return {
        SessionContext: createContext(undefined),
        SessionProvider: ({ children }: any) => children,
        useSession: vi.fn().mockReturnValue({
            data: null,
            status: 'unauthenticated',
            update: vi.fn(),
        }),
        signIn: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn().mockResolvedValue(null),
        getCsrfToken: vi.fn().mockResolvedValue(''),
        getProviders: vi.fn().mockResolvedValue({}),
    };
});

window.location = {
    ...((window.location as any) || {}),
    pathname: '/en-US/',
    host: 'staging.storefront.localhost',
    href: 'https://staging.storefront.localhost/en-US/',
    search: '',
    origin: 'https://staging.storefront.localhost',
    protocol: 'https:',
};
