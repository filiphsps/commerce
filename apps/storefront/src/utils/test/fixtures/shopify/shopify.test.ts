import { describe, expect, it } from 'vitest';
import { mockCollection } from '@/utils/test/fixtures/shopify/collection';
import { mockNavigation } from '@/utils/test/fixtures/shopify/navigation';
import { mockPage } from '@/utils/test/fixtures/shopify/page';
import { mockProduct } from '@/utils/test/fixtures/shopify/product';

describe('shopify fixtures', () => {
    it('mockProduct returns a product with a handle and a default variant', () => {
        const product = mockProduct({ handle: 'demo-tee' });
        expect(product.handle).toBe('demo-tee');
        expect(product.variants.nodes).toHaveLength(1);
        expect(product.variants.nodes[0]!.availableForSale).toBe(true);
    });

    it('mockCollection returns a collection with a product reference', () => {
        const collection = mockCollection({ handle: 'all' });
        expect(collection.handle).toBe('all');
        expect(collection.products.nodes).toHaveLength(1);
    });

    it('mockPage returns a page with handle and HTML body', () => {
        const page = mockPage({ handle: 'about' });
        expect(page.handle).toBe('about');
        expect(page.body).toContain('<p>');
    });

    it('mockNavigation returns a navigation menu with at least one item', () => {
        const nav = mockNavigation();
        expect(nav.items.length).toBeGreaterThan(0);
    });
});
