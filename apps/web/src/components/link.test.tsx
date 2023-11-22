import type { Locale } from '@/utils/locale';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Link from './link';

describe('components', () => {
    describe('Link', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        vi.mock('@/utils/build-config', () => ({
            BuildConfig: {
                domain: 'example.com',
                i18n: {
                    default: 'en-US'
                }
            }
        }));

        it('should render a link with the correct href', () => {
            const href = '/some/path';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link).not.toBeNull();
            expect(link?.getAttribute('href')).toBe(`/en-US${href}`);
        });

        it('should throw an error if href is not a string', () => {
            const href = { invalid: 'href' };
            expect(() => render(<Link href={href as any} />)).toThrowErrorMatchingSnapshot();
        });

        it('should add the locale to the href if it is not already present', () => {
            const href = '/some/path';
            const locale: Locale = { locale: 'sv-SE', language: 'sv', country: 'SE' } as any;
            const { container } = render(<Link href={href} locale={locale} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(`/${locale.locale}${href}`);
        });

        it('should not add the locale to the href if it is already present', () => {
            const href = '/sv-SE/some/path';
            const locale: Locale = { locale: 'sv-SE', language: 'sv', country: 'SE' } as any;
            const { container } = render(<Link href={href} locale={locale} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(href);
            expect(link).toMatchSnapshot();
        });

        it.fails('should remove the current domain from the href', () => {
            const href = `https://example.com/some/path`;
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe('/en-US/some/path');
        });

        it('should remove double slashes from the href', () => {
            const href = '/some//path';
            const { container } = render(<Link href={href} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe('/en-US/some/path');
            expect(link).toMatchSnapshot();
        });

        it('should pass through all other props to the underlying link', () => {
            const href = '/en-US/some/path';
            const className = 'my-link';
            const { container } = render(<Link href={href} className={className} />);
            const link = container.querySelector('a');
            expect(link?.getAttribute('href')).toBe(href);
            expect(link?.getAttribute('class')).toBe(className);
        });
    });
});
