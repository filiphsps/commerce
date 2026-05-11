import { describe, expect, it, vi } from 'vitest';
import ProductCardActions from '@/components/product-card/product-card-actions';
import { mockProduct } from '@/utils/test/fixtures';
import { render, screen } from '@/utils/test/react';

let mockCartState: Record<string, any> = {
    cartReady: true,
    lines: [],
    linesUpdate: vi.fn(),
};

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => mockCartState,
    };
});

vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return {
        ...actual,
        useShop: () => ({
            shop: {
                commerce: { maxQuantity: 50 },
                commerceProvider: { type: 'shopify', domain: 'mock.shop' },
            } as any,
            currency: 'USD',
            locale: { code: 'en-US', language: 'EN', country: 'US' } as any,
        }),
    };
});

const selectedVariant = {
    id: 'gid://shopify/ProductVariant/1',
    sku: 'SKU-1',
    availableForSale: true,
    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
    price: { amount: '10.00', currencyCode: 'USD' },
    compareAtPrice: null,
    image: null,
} as any;

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardActions', () => {
            it('renders null when cart is not ready (cartReady is undefined)', () => {
                mockCartState = { cartReady: undefined, lines: [], linesUpdate: vi.fn() };
                const product = mockProduct() as any;
                const { container } = render(
                    <ProductCardActions i18n={{} as any} data={product} selectedVariant={selectedVariant} />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('renders AddToCart button when the selected variant is not in the cart', () => {
                mockCartState = { cartReady: true, lines: [], linesUpdate: vi.fn() };
                const product = mockProduct() as any;
                render(<ProductCardActions i18n={{} as any} data={product} selectedVariant={selectedVariant} />);
                // AddToCart renders a button
                expect(screen.getByRole('button')).toBeTruthy();
            });

            it('renders QuantitySelector when the selected variant is already in the cart', () => {
                mockCartState = {
                    cartReady: true,
                    lines: [
                        {
                            id: 'line-1',
                            quantity: 2,
                            merchandise: { id: selectedVariant.id },
                        },
                    ],
                    linesUpdate: vi.fn(),
                };
                const product = mockProduct() as any;
                render(<ProductCardActions i18n={{} as any} data={product} selectedVariant={selectedVariant} />);
                const input = screen.getByLabelText('quantity') as HTMLInputElement;
                expect(input).toBeTruthy();
                expect(input.value).toBe('2');
            });
        });
    });
});
