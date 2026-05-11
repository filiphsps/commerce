import { describe, expect, it, vi } from 'vitest';
import ProductCardFooter from '@/components/product-card/product-card-footer';
import { mockProduct } from '@/utils/test/fixtures';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ cartReady: true, status: 'idle', lines: [] }),
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

vi.mock('@/utils/locale', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/utils/locale')>();
    return {
        ...actual,
        isSizeOption: () => false,
        formatWeight: (v: any) => String(v),
        localizeWeight: (_locale: any, v: any) => v,
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

const product = mockProduct({
    variants: {
        edges: [{ node: selectedVariant }],
        pageInfo: {},
    },
}) as any;

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardFooter', () => {
            it('renders nothing when product is not provided', () => {
                const { container } = render(
                    <ProductCardFooter locale={{ code: 'en-US' } as any} i18n={{} as any} setSelected={vi.fn()} />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('renders without crashing when product and selected variant are provided', () => {
                expect(() =>
                    render(
                        <ProductCardFooter
                            data={product}
                            selected={selectedVariant}
                            locale={{ code: 'en-US' } as any}
                            i18n={{} as any}
                            setSelected={vi.fn()}
                        />,
                    ),
                ).not.toThrow();
            });
        });
    });
});
