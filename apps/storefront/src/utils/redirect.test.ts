import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation before importing the module under test
const mockRedirect = vi.fn();
const mockNotFound = vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
    notFound: mockNotFound,
    RedirectType: { replace: 'replace' },
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: vi.fn().mockResolvedValue({ id: 'shop-1', domain: 'example.com' }) },
}));

const mockRedirectApi = vi.fn();
vi.mock('@/api/shopify/redirects', () => ({
    RedirectApi: mockRedirectApi,
}));
vi.mock('@/api/shopify', () => ({
    ShopifyApiClient: vi.fn().mockResolvedValue({}),
}));

describe('checkAndHandleRedirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does NOT redirect when no target is found', async () => {
        mockRedirectApi.mockResolvedValue(null);
        const { checkAndHandleRedirect } = await import('./redirect');
        await checkAndHandleRedirect({
            domain: 'example.com',
            locale: { code: 'en-US' } as never,
            path: '/products/gone',
        });
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('calls redirect() when a valid different target is found', async () => {
        mockRedirectApi.mockResolvedValue('/products/new-handle');
        const { checkAndHandleRedirect } = await import('./redirect');
        await checkAndHandleRedirect({
            domain: 'example.com',
            locale: { code: 'en-US' } as never,
            path: '/products/old-handle',
        });
        expect(mockRedirect).toHaveBeenCalledWith('/products/new-handle', 'replace');
    });

    it('calls notFound() (not redirect) when normalized target equals normalized source — prevents infinite loop', async () => {
        // Shopify redirect: /products/My-Product → /products/my-product
        // RedirectApi lowercases both → target = '/products/my-product'
        // The request path is also /products/my-product after middleware normalization
        // Without the guard this would redirect to itself forever
        mockRedirectApi.mockResolvedValue('/products/my-product');
        const { checkAndHandleRedirect } = await import('./redirect');
        // notFound() throws in Next.js — that's the intended behavior
        await expect(
            checkAndHandleRedirect({
                domain: 'example.com',
                locale: { code: 'en-US' } as never,
                path: '/products/my-product',
            }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('calls notFound() when target matches source regardless of trailing slash', async () => {
        mockRedirectApi.mockResolvedValue('/products/handle/');
        const { checkAndHandleRedirect } = await import('./redirect');
        await expect(
            checkAndHandleRedirect({
                domain: 'example.com',
                locale: { code: 'en-US' } as never,
                path: '/products/handle',
            }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockRedirect).not.toHaveBeenCalled();
    });
});
