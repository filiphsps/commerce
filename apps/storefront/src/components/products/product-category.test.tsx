import { describe, expect, it, vi } from 'vitest';

import { Locale } from '@/utils/locale';
import { render, waitFor } from '@/utils/test/react';

import { ProductCategory } from '@/components/products/product-category';

describe('components', () => {
    describe('ProductCategory', () => {
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
                if (handle !== 'test-type') {
                    throw new Error();
                }

                return {
                    handle: 'test-type',
                    title: 'Test Type'
                };
            })
        }));

        it('renders without errors', async () => {
            const { unmount } = render(
                await ProductCategory({
                    shop: {} as any,
                    locale: Locale.default,
                    product: { productType: 'Test Type' } as any
                })
            );

            await waitFor(() => expect(unmount).not.toThrow());
        });

        it('renders nothing when no product type is present', async () => {
            const { container, unmount } = render(
                await ProductCategory({ shop: {} as any, locale: Locale.default, product: {} as any })
            );
            await waitFor(() => {
                expect(container.textContent).toBe('');
                expect(container.childElementCount).toBe(0);
                expect(unmount).not.toThrow();
            });
        });

        it('renders the product type', async () => {
            const { container, unmount } = render(
                await ProductCategory({
                    shop: {} as any,
                    locale: Locale.default,
                    product: { productType: 'Test Type' } as any
                })
            );

            await waitFor(() => {
                expect(container.textContent).toBe('Test Type');
                expect(container.querySelector('a')?.href).toBe('/collections/test-type/');
                expect(container.childElementCount).toBe(1);
                expect(unmount).not.toThrow();
            });
        });
    });
});
