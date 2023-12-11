import type { PageApi as OriginalPageApi } from '@/api/page';
import { render, screen } from '@/utils/test/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductPageParams } from './page';
import ProductPage, { generateMetadata } from './page';

describe('app', () => {
    vi.mock('@/utils/prefetch', () => ({
        Prefetch: vi.fn().mockResolvedValue({})
    }));
    vi.mock('@/i18n/dictionary', () => ({
        getDictionary: vi.fn().mockResolvedValue({})
    }));

    // Mock various API functions.
    vi.mock('@/api/shopify', () => ({
        StorefrontApiClient: vi.fn().mockReturnValue({
            query: vi.fn().mockResolvedValue({})
        }),
        ShopifyApolloApiClient: vi.fn().mockReturnValue({})
    }));
    vi.mock('@/api/page', () => {
        let PageApi = vi.fn().mockResolvedValue({
            page: {
                slices: []
            }
        }) as any as typeof OriginalPageApi;
        PageApi.preload = vi.fn().mockResolvedValue({});
        return {
            PageApi
        };
    });
    vi.mock('@/api/store', () => ({
        StoreApi: vi.fn().mockResolvedValue({
            i18n: {
                locales: ['en-US', 'de-DE', 'en-GB']
            }
        }),
        useShop: vi.fn().mockReturnValue({})
    }));

    vi.mock('next/navigation', () => ({
        usePathname: vi.fn().mockReturnValue(''),
        useRouter: vi.fn().mockReturnValue({
            replace: vi.fn()
        }),
        useSearchParams: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue('') })
    }));

    // Mock `@shopify/hydrogen-react`.
    vi.mock('@shopify/hydrogen-react', async () => {
        return {
            ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
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
            })
        };
    });

    describe('ProductPage', () => {
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
        const params: ProductPageParams = {
            domain: 'staging.demo.nordcom.io',
            locale: 'en-US',
            handle: product.handle
        };

        // Mock the `ProductApi` function to prevent API calls.
        vi.mock('@/api/shopify/product', () => ({
            ProductApi: vi.fn().mockResolvedValue({ ...product })
        }));

        vi.mock('@/api/shop', () => ({
            ShopApi: vi.fn().mockResolvedValue({
                id: 'mock-shop-id',
                domains: {
                    primary: 'staging.demo.nordcom.io',
                    alternatives: []
                },
                configuration: {
                    commerce: {
                        type: 'dummy' as const,
                        domain: 'mock.shop' as const
                    }
                }
            })
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
            const metadata = await generateMetadata({ params });
            expect(metadata!.title).toBe(`${product.vendor} ${product.title}`);
        });
    });
});
