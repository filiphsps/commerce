import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/utils/test/react';

import ProductPage, { generateMetadata } from './page';

import type { ProductPageParams } from './page';
import type { PageApi as OriginalPageApi } from '@/api/page';

describe('app', () => {
    vi.mock('@/i18n/dictionary', () => ({
        getDictionary: vi.fn().mockResolvedValue({})
    }));

    // Mock various API functions.
    vi.mock('@/api/shopify', () => ({
        ShopifyApolloApiClient: vi.fn().mockReturnValue({
            query: vi.fn().mockResolvedValue({})
        })
    }));
    vi.mock('@/api/page', () => {
        let PageApi = vi.fn().mockResolvedValue({
            page: {
                slices: []
            }
        }) as any as typeof OriginalPageApi;
        return {
            PageApi
        };
    });
    vi.mock('@/api/store', () => ({
        useShop: vi.fn().mockReturnValue({}),
        LocalesApi: vi.fn().mockResolvedValue([]),
        ShopPaymentSettingsApi: vi.fn().mockReturnValue({})
    }));

    vi.mock('next/navigation', () => ({
        usePathname: vi.fn().mockReturnValue(''),
        useRouter: vi.fn().mockReturnValue({
            replace: vi.fn()
        }),
        useSearchParams: vi.fn().mockReturnValue(new URLSearchParams())
    }));

    // Mock `@shopify/hydrogen-react`.
    vi.mock('@shopify/hydrogen-react', async () => {
        return {
            ...(((await vi.importActual('@shopify/hydrogen-react')) as any) || {}),
            flattenConnection: vi.fn().mockImplementation((data) => data),
            useProduct: vi.fn().mockReturnValue({
                selectedVariant: {
                    availableForSale: true
                },
                product: {
                    variants: {
                        edges: []
                    },
                    sellingPlanGroups: {
                        edges: []
                    },
                    images: {
                        edges: []
                    }
                },
                selectedOptions: [],
                variants: [
                    {
                        availableForSale: true,
                        selectedOptions: []
                    }
                ]
            }),
            useCart: vi.fn().mockReturnValue({
                status: 'uninitialized'
            }),
            useShop: vi.fn().mockReturnValue({}),
            useShopifyCookies: vi.fn().mockReturnValue({})
        };
    });

    describe.todo('ProductPage', () => {
        const { product } = vi.hoisted(() => ({
            product: {
                title: 'Test Product',
                handle: 'test-product',
                vendor: 'Test Vendor',
                sellingPlanGroups: {
                    edges: []
                },
                images: {
                    edges: [
                        {
                            node: {
                                id: '1',
                                url: 'https://placehold.co/50x50.png'
                            }
                        }
                    ]
                },
                variants: {
                    edges: [
                        {
                            node: {
                                price: {
                                    amount: '10.00',
                                    currencyCode: 'USD'
                                },
                                compareAtPrice: {
                                    amount: '15.00',
                                    currencyCode: 'USD'
                                },
                                selectedOptions: [],
                                images: []
                            }
                        }
                    ]
                }
            }
        }));
        const params: ProductPageParams = (async () => ({
            domain: 'staging.demo.nordcom.io',
            locale: 'en-US',
            handle: product.handle
        }))();

        // Mock the `ProductApi` function to prevent API calls.
        vi.mock('@/api/shopify/product', () => {
            let ProductApi = vi.fn().mockResolvedValue({
                ...product
            }) as any as typeof OriginalPageApi;
            return {
                ProductApi
            };
        });

        vi.mock('@nordcom/commerce-db', () => ({
            Shop: {
                findByDomain: vi.fn().mockResolvedValue({
                    id: 'mock-shop-id',
                    domains: 'staging.demo.nordcom.io',
                    commerceProvider: {
                        type: 'shopify' as const,
                        domain: 'mock.shop' as const
                    }
                })
            }
        }));

        it('renders the product title and vendor', async () => {
            render(await ProductPage({ params }));
            const title = await screen.findByText(product.title);
            const vendor = await screen.findByText(product.vendor);

            expect(title).toBeDefined();
            expect(vendor).toBeDefined();
        });

        it('renders the product image', async () => {
            render(await ProductPage({ params }));
            const image = await screen.findByRole('img');
            expect(image.getAttribute('src')).toBeDefined();
        });

        it('renders the product pricing', async () => {
            render(await ProductPage({ params }));
            const price = await screen.findByText('$10.00');
            const compareAtPrice = await screen.findByText('$15.00');
            expect(price).toBeDefined();
            expect(compareAtPrice).toBeDefined();
        });

        it('generates the correct metadata', async () => {
            const metadata = await generateMetadata({
                params,
                searchParams: (async () => ({}) as any)()
            });
            expect(metadata!.title).toBe(`${product.vendor} ${product.title}`);
        });
    });
});
