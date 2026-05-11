import { describe, expect, it, vi } from 'vitest';
import ProductCardContent from '@/components/product-card/product-card-content';
import { render } from '@/utils/test/react';
import { mockProduct } from '@/utils/test/fixtures';

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shopify/hydrogen-react')>();
    return {
        ...actual,
        useCart: () => ({ cartReady: true, status: 'idle', lines: [] }),
        Image: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
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

// ProductCardHeader and ProductCardFooter are client components; stub them here.
vi.mock('@/components/product-card/product-card-header', () => ({
    default: () => <div data-testid="product-card-header" />,
}));

vi.mock('@/components/product-card/product-card-footer', () => ({
    default: () => <div data-testid="product-card-footer" />,
}));

const makeProduct = (overrides: Record<string, any> = {}) =>
    mockProduct({
        variants: {
            edges: [
                {
                    node: {
                        id: 'gid://shopify/ProductVariant/1',
                        availableForSale: true,
                        selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                        price: { amount: '10.00', currencyCode: 'USD' },
                        compareAtPrice: null,
                    },
                },
            ],
            pageInfo: {},
        },
        ...overrides,
    }) as any;

describe('components', () => {
    describe('product-card', () => {
        describe('ProductCardContent', () => {
            it('renders nothing when product is not provided', () => {
                const { container } = render(
                    <ProductCardContent
                        locale={{ code: 'en-US' } as any}
                        i18n={{} as any}
                    />,
                );
                expect(container.firstChild).toBeNull();
            });

            it('renders price for a regular product', () => {
                const product = makeProduct();
                const { container } = render(
                    <ProductCardContent
                        data={product}
                        locale={{ code: 'en-US' } as any}
                        i18n={{} as any}
                    />,
                );
                // Price component should render something with the price amount
                expect(container.textContent).toMatch(/10/);
            });

            it('renders sale price and original price when variant is on sale', () => {
                const product = makeProduct({
                    variants: {
                        edges: [
                            {
                                node: {
                                    id: 'gid://shopify/ProductVariant/1',
                                    availableForSale: true,
                                    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
                                    price: { amount: '5.00', currencyCode: 'USD' },
                                    compareAtPrice: { amount: '10.00', currencyCode: 'USD' },
                                },
                            },
                        ],
                        pageInfo: {},
                    },
                });

                const { container } = render(
                    <ProductCardContent
                        data={product}
                        locale={{ code: 'en-US' } as any}
                        i18n={{} as any}
                    />,
                );
                // Both the sale price (5) and compare-at price (10) should appear
                expect(container.textContent).toMatch(/5/);
                expect(container.textContent).toMatch(/10/);
            });
        });
    });
});
