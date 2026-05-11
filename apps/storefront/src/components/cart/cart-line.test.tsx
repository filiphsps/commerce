import { describe, expect, it, vi } from 'vitest';
import { CartLine } from '@/components/cart/cart-line';
import { render, screen } from '@/utils/test/react';

const mockLinesUpdate = vi.fn();
const mockLinesRemove = vi.fn();

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({
            cartReady: true,
            status: 'idle',
            linesUpdate: mockLinesUpdate,
            linesRemove: mockLinesRemove,
        }),
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

const makeLineData = (overrides: Record<string, any> = {}) => ({
    id: 'line-1',
    quantity: 2,
    cost: {
        totalAmount: { amount: '20.00', currencyCode: 'USD' },
        compareAtAmountPerQuantity: null,
    },
    discountAllocations: [],
    merchandise: {
        id: 'variant-1',
        title: 'Size M',
        sku: 'SKU-1',
        availableForSale: true,
        selectedOptions: [{ name: 'Size', value: 'M' }],
        price: { amount: '10.00', currencyCode: 'USD' },
        compareAtPrice: null,
        image: null,
        product: {
            id: 'product-1',
            handle: 'demo-product',
            title: 'Demo Product',
            vendor: 'Demo Vendor',
            productType: '',
        },
    },
    ...overrides,
});

describe('components', () => {
    describe('CartLine', () => {
        it('renders the product title and vendor', () => {
            render(<CartLine i18n={{} as any} data={makeLineData() as any} />);
            expect(screen.getByText('Demo Product')).toBeTruthy();
            expect(screen.getByText('Demo Vendor')).toBeTruthy();
        });

        it('renders null when product is missing from merchandise', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const data = makeLineData();
            const dataWithNoProduct = {
                ...data,
                merchandise: { ...data.merchandise, product: null as any },
            };
            const { container } = render(<CartLine i18n={{} as any} data={dataWithNoProduct as any} />);
            expect(container.firstChild).toBeNull();
        });

        it('renders the quantity selector', () => {
            render(<CartLine i18n={{} as any} data={makeLineData() as any} />);
            // QuantitySelector renders an input with aria-label "quantity"
            const input = screen.getByLabelText('quantity') as HTMLInputElement;
            expect(input).toBeTruthy();
            expect(input.value).toBe('2');
        });
    });
});
