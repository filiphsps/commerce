import { describe, expect, it, vi } from 'vitest';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

let mockPathname = '/';
vi.mock('next/navigation', async (importOriginal) => ({
    ...(await importOriginal<typeof import('next/navigation')>()),
    usePathname: () => mockPathname,
}));

describe('components', () => {
    describe('Breadcrumbs', () => {
        it('should render without crashing', () => {
            mockPathname = '/';
            const wrapper = render(<Breadcrumbs locale={Locale.default} />);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('links each crumb to its own cumulative path', () => {
            mockPathname = '/en-US/collections/mens/shirts';
            const { container } = render(<Breadcrumbs locale={Locale.default} />);

            // Crumb hrefs (excluding the leading shop-home link).
            const crumbHrefs = [...container.querySelectorAll('nav a')]
                .map((a) => a.getAttribute('href') ?? '')
                .filter((href) => /\/collections/.test(href));

            // The regression: every crumb used to resolve to the same URL.
            expect(new Set(crumbHrefs).size).toBe(crumbHrefs.length);
            expect(crumbHrefs.some((href) => href.endsWith('/collections'))).toBe(true);
            expect(crumbHrefs.some((href) => href.endsWith('/collections/mens'))).toBe(true);
        });

        it('exposes a breadcrumb landmark and marks the current crumb', () => {
            mockPathname = '/en-US/collections/mens/shirts';
            const { container } = render(<Breadcrumbs locale={Locale.default} />);

            expect(container.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull();
            expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
        });
    });
});
