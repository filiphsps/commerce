import { beforeEach, describe, expect, it, vi } from 'vitest';
import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useShop: vi.fn().mockReturnValue({
            domain: 'staging.storefront.localhost',
        }),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

vi.mock('@/utils/build-config', () => ({
    BuildConfig: {
        domain: 'staging.storefront.localhost',
        i18n: {
            default: 'en-US',
        },
    },
}));

describe('components', () => {
    describe('Link', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        it('should render a link with the correct `href`', () => {
            const href = '/some/path';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link).not.toBeNull();
            expect(link?.getAttribute('href')).toBe(`/en-US${href}`);
        });

        it('returns null when `href` is not a string', () => {
            // The invalid-href diagnostic is now emitted via OTel addEvent (no-op in
            // tests without an active tracer) rather than console.error.
            const href = { invalid: 'href' };
            const { container } = render(<Link href={href as any} />);
            expect(container.querySelector('a')).toBeNull();
        });

        it('should add the locale to the `href` if it is not already present', () => {
            const href = '/some/path';
            const locale: Locale = { locale: 'sv-SE', language: 'sv', country: 'SE' } as any;
            const { container } = render(<Link href={href} locale={locale} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(`/${locale.code}${href}`);
            //expect(link).toMatchSnapshot();
        });

        it('should not add the locale to the `href` if it is already present', () => {
            const href = '/sv-SE/some/path';
            const locale: Locale = { locale: 'sv-SE', language: 'sv', country: 'SE' } as any;
            const { container } = render(<Link href={href} locale={locale} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(href);
            //expect(link).toMatchSnapshot();
        });

        it('should remove the current domain from the `href`', () => {
            vi.spyOn(window, 'location', 'get').mockReturnValue({ host: 'staging.storefront.localhost' } as any);
            window.location.host = 'staging.storefront.localhost';
            const href = `https://staging.storefront.localhost/some/path`;
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe('/en-US/some/path');
            //expect(link).toMatchSnapshot();
        });

        it('should remove double slashes from the `href`', () => {
            const href = '/some//path';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe('/en-US/some/path');
            //expect(link).toMatchSnapshot();
        });

        it('should pass through all other props to the underlying link', () => {
            const href = '/en-US/some/path';
            const className = 'my-link';
            const { container } = render(<Link href={href} className={className} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(href);
            expect(link?.getAttribute('class')).toBe(className);
        });

        it('hardens new-tab links with rel="noopener noreferrer"', () => {
            const { container } = render(<Link href="https://example.com" target="_blank" />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('target')).toBe('_blank');
            expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
        });

        it('preserves an explicit rel on a new-tab link', () => {
            const { container } = render(<Link href="https://example.com" target="_blank" rel="nofollow" />);
            expect(container.querySelector('a')?.getAttribute('rel')).toBe('nofollow');
        });

        it('does not add rel to same-tab links', () => {
            const { container } = render(<Link href="/some/path" />);
            expect(container.querySelector('a')?.getAttribute('rel')).toBeNull();
        });

        it('should handle `href` using `tel:`, `mailto:`, etc protocols', () => {
            const href = 'mailto:hi@nordcom.io';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(href);
            //expect(link).toMatchSnapshot();
        });
    });
});
