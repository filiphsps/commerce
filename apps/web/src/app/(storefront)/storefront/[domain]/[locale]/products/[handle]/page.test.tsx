import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductPage, { generateMetadata } from './page';

import type { ProductPageParams } from './page';

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
        })
    }));
    vi.mock('@/api/page', () => ({
        PageApi: vi.fn().mockResolvedValue({
            page: {
                slices: []
            }
        })
    }));
    vi.mock('@/api/store', () => ({
        StoreApi: vi.fn().mockResolvedValue({
            i18n: {
                locales: ['en-US', 'de-DE', 'en-GB']
            }
        })
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
                product: {},
                variants: [
                    {
                        availableForSale: true
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
                                selectedOptions: []
                            }
                        }
                    ]
                }
            }
        }));
        const params: ProductPageParams = {
            domain: 'www.sweetsideofsweden.com',
            locale: 'en-US',
            handle: product.handle
        };

        // Mock the `ProductApi` function to prevent API calls.
        vi.mock('@/api/shopify/product', () => ({
            ProductApi: vi.fn().mockResolvedValue({ ...product })
        }));

        it('renders the product title and vendor', async () => {
            render(await ProductPage({ params }));
            const title = await screen.findByText(product.title);
            const vendor = await screen.findByText(product.vendor);

            expect(title).toBeInTheDocument();
            expect(vendor).toBeInTheDocument();
        });

        it.skip('renders the product image', async () => {
            render(await ProductPage({ params }));
            const image = await screen.findByRole('img');
            expect(image).toHaveAttribute('src', product.images.edges[0].node.url);
        });

        it.skip('renders the product pricing', async () => {
            render(await ProductPage({ params }));
            const price = await screen.findByText('$10.00');
            const compareAtPrice = await screen.findByText('$15.00');
            expect(price).toBeInTheDocument();
            expect(compareAtPrice).toBeInTheDocument();
        });

        it('generates the correct metadata', async () => {
            const metadata = await generateMetadata({ params });
            expect(metadata!.title).toBe(`${product.vendor} ${product.title}`);
        });
    });
});
