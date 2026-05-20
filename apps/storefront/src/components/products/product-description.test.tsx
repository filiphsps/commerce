import { describe, expect, it, vi } from 'vitest';
import { ProductDescription } from '@/components/products/product-description';
import { Locale } from '@/utils/locale';
import { mockProduct, mockShop } from '@/utils/test/fixtures';
import { render, waitFor } from '@/utils/test/react';

vi.mock('@/pages/products/[handle]/product-details', () => ({
    ProductOriginalName: vi.fn().mockImplementation(({ data }: { data: { originalName?: { value?: string } } }) => {
        const value = data?.originalName?.value;
        if (!value) return null;
        return <p data-testid="product-original-name">{value}</p>;
    }),
}));

describe('components', () => {
    describe('ProductDescription', () => {
        const shop = mockShop();

        it('exposes the expected displayName', () => {
            expect(ProductDescription.displayName).toBe('Nordcom.Product.Description');
        });

        it('renders without throwing for a minimal product', async () => {
            const { unmount } = render(
                await ProductDescription({
                    shop,
                    locale: Locale.default,
                    product: mockProduct() as never,
                }),
            );

            await waitFor(() => expect(unmount).not.toThrow());
        });

        it('renders the descriptionHtml as React nodes', async () => {
            const { container } = render(
                await ProductDescription({
                    shop,
                    locale: Locale.default,
                    product: mockProduct({
                        descriptionHtml: '<p>Hello <strong>world</strong>.</p>',
                    }) as never,
                }),
            );

            await waitFor(() => {
                const paragraph = container.querySelector('p');
                expect(paragraph?.textContent).toBe('Hello world.');
                expect(container.querySelector('strong')?.textContent).toBe('world');
            });
        });

        it('renders no description prose container when descriptionHtml is empty', async () => {
            const { container } = render(
                await ProductDescription({
                    shop,
                    locale: Locale.default,
                    product: mockProduct({ descriptionHtml: '' }) as never,
                }),
            );

            await waitFor(() => {
                expect(container.querySelector('.prose')).toBeNull();
            });
        });

        it('does not render ProductOriginalName when the product has no originalName metafield', async () => {
            const { queryByTestId } = render(
                await ProductDescription({
                    shop,
                    locale: Locale.default,
                    product: mockProduct() as never,
                }),
            );

            await waitFor(() => {
                expect(queryByTestId('product-original-name')).toBeNull();
            });
        });

        it('renders ProductOriginalName when the product has an originalName metafield', async () => {
            const { findByTestId } = render(
                await ProductDescription({
                    shop,
                    locale: Locale.default,
                    product: mockProduct({
                        originalName: {
                            type: 'single_line_text_field',
                            value: 'Original Product Name',
                        },
                    }) as never,
                }),
            );

            const el = await findByTestId('product-original-name');
            expect(el.textContent).toBe('Original Product Name');
        });

        it('merges a custom className with the default layout classes on the wrapping Card', async () => {
            const { container } = render(
                await ProductDescription({
                    shop,
                    locale: Locale.default,
                    product: mockProduct() as never,
                    className: 'custom-class',
                }),
            );

            await waitFor(() => {
                const card = container.firstElementChild as HTMLElement;
                expect(card.className).toContain('flex');
                expect(card.className).toContain('flex-col');
                expect(card.className).toContain('gap-3');
                expect(card.className).toContain('custom-class');
            });
        });

        describe('skeleton', () => {
            it('exposes the expected displayName', () => {
                expect(ProductDescription.skeleton.displayName).toBe('Nordcom.Product.Description.skeleton');
            });

            it('renders without throwing', () => {
                const { unmount } = render(<ProductDescription.skeleton />);
                expect(unmount).not.toThrow();
            });

            it('renders skeleton placeholders', () => {
                const { container } = render(<ProductDescription.skeleton />);
                expect(container.querySelectorAll('[data-skeleton]').length).toBeGreaterThan(0);
            });

            it('merges a custom className with the default layout classes on the wrapping Card', () => {
                const { container } = render(<ProductDescription.skeleton className="custom-skeleton" />);
                const card = container.firstElementChild as HTMLElement;
                expect(card.className).toContain('flex');
                expect(card.className).toContain('flex-col');
                expect(card.className).toContain('gap-3');
                expect(card.className).toContain('custom-skeleton');
            });
        });
    });
});
