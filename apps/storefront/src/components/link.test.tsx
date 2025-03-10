import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';

import Link from '@/components/link';

import type { Locale } from '@/utils/locale';

describe('components', () => {
    describe('Link', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({
                    domain: 'staging.demo.nordcom.io'
                }),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        vi.mock('@/utils/build-config', () => ({
            BuildConfig: {
                domain: 'staging.demo.nordcom.io',
                i18n: {
                    default: 'en-US'
                }
            }
        }));

        it('should render a link with the correct `href`', () => {
            const href = '/some/path';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link).not.toBeNull();
            expect(link?.getAttribute('href')).toBe(`/en-US${href}`);
        });

        it.skip('should throw an error if `href` is not a string', () => {
            const href = { invalid: 'href' };
            expect(() => render(<Link href={href as any} />)).toThrowError();
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
            vi.spyOn(window, 'location', 'get').mockReturnValue({ host: 'staging.demo.nordcom.io' } as any);
            window.location.host = 'staging.demo.nordcom.io';
            const href = `https://staging.demo.nordcom.io/some/path`;
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

        it('should handle `href` using `tel:`, `mailto:`, etc protocols', () => {
            const href = 'mailto:hi@nordcom.io';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(href);
            //expect(link).toMatchSnapshot();
        });
    });
});
