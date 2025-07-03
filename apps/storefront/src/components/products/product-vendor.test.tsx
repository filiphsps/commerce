import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/utils/locale';
import { render, waitFor } from '@/utils/test/react';

import { ProductVendor } from '@/components/products/product-vendor';

describe('components', () => {
    describe('ProductVendor', () => {
        vi.mock('@/components/link', () => {
            return {
                default: vi.fn().mockImplementation(({ children, href }) => {
                    return <a href={href}>{children as any}</a>;
                })
            };
        });

        vi.mock('@/api/shopify', () => ({
            ShopifyApiClient: vi.fn().mockReturnValue({})
        }));
        vi.mock('@/api/shopify/collection', () => ({
            CollectionApi: vi.fn().mockImplementation(async ({ handle }: { handle: string }) => {
                if (handle !== 'test-vendor') {
                    throw new Error();
                }

                return {
                    handle: 'test-vendor',
                    title: 'Test Vendor'
                };
            })
        }));

        it('renders without errors', async () => {
            const { unmount } = render(
                await ProductVendor({
                    shop: {} as any,
                    locale: Locale.default,
                    product: { vendor: 'Test Vendor' } as any
                })
            );

            await waitFor(() => expect(unmount).not.toThrow());
        });

        it('renders nothing when no product vendor is present', async () => {
            const { container, unmount } = render(
                await ProductVendor({ shop: {} as any, locale: Locale.default, product: {} as any })
            );
            await waitFor(() => {
                expect(container.textContent).toBe('');
                expect(container.childElementCount).toBe(0);
                expect(unmount).not.toThrow();
            });
        });

        it('renders the product vendor', async () => {
            const { container, unmount } = render(
                await ProductVendor({
                    shop: {} as any,
                    locale: Locale.default,
                    product: { vendor: 'Test Vendor' } as any
                })
            );

            await waitFor(() => {
                expect(container.textContent).toBe('Test Vendor');
                expect(container.querySelector('a')?.href).toBe('/collections/test-vendor/');
                expect(container.childElementCount).toBe(1);
                expect(unmount).not.toThrow();
            });
        });
    });
});
