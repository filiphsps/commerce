import { describe, expect, it, vi } from 'vitest';
import Vendors from '@/components/informational/vendors';
import { Locale } from '@/utils/locale';
import { render, waitFor } from '@/utils/test/react';

vi.mock('@/components/link', () => ({
    default: vi.fn().mockImplementation(({ children, href }) => <a href={href}>{children}</a>),
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/api/shopify/vendor', () => ({
    VendorsApi: vi.fn().mockResolvedValue([
        { handle: 'acme', title: 'Acme' },
        { handle: 'other-brand', title: 'Other Brand' },
    ]),
}));

describe('components', () => {
    describe('Vendors', () => {
        it('links each vendor to the filtered products listing (never a dead collection link)', async () => {
            const { container, unmount } = render(await Vendors({ shop: {} as any, locale: Locale.default }));

            await waitFor(() => {
                const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
                expect(hrefs).toContain('/products/?vendor=Acme');
                expect(hrefs).toContain('/products/?vendor=Other%20Brand');
                // No vendor chip points at a (possibly non-existent) collection.
                expect(hrefs.some((href) => href?.startsWith('/collections/'))).toBe(false);
                expect(unmount).not.toThrow();
            });
        });
    });
});
