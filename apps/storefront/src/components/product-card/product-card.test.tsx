import { describe, expect, it } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCard, { toProductCardData } from '@/components/product-card/product-card';
import { mockShop } from '@/utils/test/fixtures';

describe('components', () => {
    describe('product-card', () => {
        describe('toProductCardData', () => {
            it('shapes a slim view from the full Product', () => {
                const product = productSimple();
                const slim = toProductCardData(product);
                expect(slim.id).toBe(product.id);
                expect(slim.handle).toBe(product.handle);
                expect(slim.title).toBe(product.title);
                expect(slim.vendor).toBe(product.vendor);
                // Slim view intentionally drops prose / SEO / extra gallery.
                // Check the canonical fields the orchestrator forwards downstream.
                expect('variants' in slim).toBe(true);
                expect('options' in slim).toBe(true);
                expect('featuredImage' in slim).toBe(true);
            });
        });

        describe('ProductCard orchestrator', () => {
            it('returns null when no variant is buyable', async () => {
                const shop = mockShop();
                const data = { ...productSimple(), variants: { edges: [] } } as never;
                const result = await ProductCard({
                    shop,
                    locale: { code: 'en-US' } as never,
                    data,
                    layout: 'vertical',
                    chrome: 'boxed',
                    ctaPlacement: 'float-pill',
                    pickerPresentation: 'auto',
                });
                expect(result).toBeNull();
            });

            it('renders a tree rooted at the chassis when a buyable variant exists', async () => {
                const shop = mockShop();
                const result = await ProductCard({
                    shop,
                    locale: { code: 'en-US' } as never,
                    data: productSimple(),
                    layout: 'vertical',
                    chrome: 'boxed',
                    ctaPlacement: 'float-pill',
                    pickerPresentation: 'auto',
                });
                expect(result).not.toBeNull();
            });
        });
    });
});
