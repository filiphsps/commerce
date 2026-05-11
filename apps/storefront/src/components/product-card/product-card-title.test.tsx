import { describe, expect, it } from 'vitest';
import ProductCardTitle from '@/components/product-card/product-card-title';
import { mockProduct, mockShop } from '@/utils/test/fixtures';
import { render, screen } from '@/utils/test/react';

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardTitle', () => {
            it('renders the product title', () => {
                const product = mockProduct({ title: 'Awesome Widget', productType: '', vendor: 'ACME' }) as any;
                const shop = mockShop({ overrides: { name: 'Other Shop' } });
                render(<ProductCardTitle shop={shop} data={product} />);
                expect(screen.getByText('Awesome Widget')).toBeTruthy();
            });

            it('renders the vendor when vendor differs from shop name', () => {
                const product = mockProduct({ title: 'Widget', vendor: 'ACME Corp', productType: '' }) as any;
                const shop = mockShop({ overrides: { name: 'Other Shop' } });
                render(<ProductCardTitle shop={shop} data={product} />);
                expect(screen.getByText('ACME Corp')).toBeTruthy();
            });

            it('omits the vendor label when vendor matches shop name', () => {
                const product = mockProduct({ title: 'Widget', vendor: 'My Shop', productType: '' }) as any;
                const shop = mockShop({ overrides: { name: 'My Shop' } });
                const { container } = render(<ProductCardTitle shop={shop} data={product} />);
                // Vendor text should NOT appear
                expect(container.textContent).not.toMatch('My Shop');
            });

            it('strips the productType suffix from the title when it duplicates', () => {
                const product = mockProduct({
                    title: 'Widget Gadget',
                    productType: 'Gadget',
                    vendor: 'ACME',
                }) as any;
                const shop = mockShop({ overrides: { name: 'Other' } });
                render(<ProductCardTitle shop={shop} data={product} />);
                // The stripped title should just be "Widget" (without "Gadget")
                const titleContainer = screen.getByText('Widget');
                expect(titleContainer).toBeTruthy();
            });
        });
    });
});
