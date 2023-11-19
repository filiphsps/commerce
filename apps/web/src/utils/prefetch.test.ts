import { CollectionApi } from '@/api/shopify/collection';
import { VendorsApi } from '@/api/shopify/vendor';
import type { StoreModel } from '@/models/StoreModel';
import type { VendorModel } from '@/models/VendorModel';
import type { CollectionPageDocumentData } from '@/prismic/types';
import type { AbstractApi } from '@/utils/abstract-api';
import type { PrefetchData } from '@/utils/prefetch';
import { Prefetch } from '@/utils/prefetch';
import type { CollectionEdge } from '@shopify/hydrogen-react/storefront-api-types';
import type { MockedFunction } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/shopify/collection');
vi.mock('@/api/shopify/vendor');

const mockCollectionApi = CollectionApi as MockedFunction<typeof CollectionApi>;
const mockVendorsApi = VendorsApi as MockedFunction<typeof VendorsApi>;

describe('utils', () => {
    describe('Prefetch', () => {
        const mockApi = {} as any as AbstractApi;
        const mockCollection: CollectionEdge['node'] = {
            id: '123',
            handle: 'collection-handle',
            title: 'Collection Title',
            description: 'Collection Description',
            image: null,
            products: {
                edges: [
                    {
                        node: {
                            id: '456',
                            handle: 'product-handle',
                            title: 'Product Title',
                            description: 'Product Description',
                            vendor: 'Product Vendor',
                            tags: ['tag1', 'tag2'],
                            availableForSale: undefined,
                            variants: {
                                edges: [
                                    {
                                        node: {
                                            id: '789',
                                            sku: 'product-sku',
                                            title: 'Product Variant Title',
                                            price: '10.00',
                                            compareAtPrice: null,
                                            availableForSale: true,
                                            weight: 0,
                                            weightUnit: 'GRAM',
                                            image: null,
                                            selectedOptions: []
                                        }
                                    }
                                ]
                            },
                            images: []
                        }
                    }
                ]
            }
        } as any;
        const mockVendor: VendorModel = {
            id: '123',
            name: 'Vendor Name'
        } as any;
        const mockStore: StoreModel = {
            id: '123',
            name: 'Store Name'
        } as any;
        const mockPage: CollectionPageDocumentData = {
            id: '123',
            uid: 'collection-page',
            type: 'collection',
            slices: [
                {
                    slice_type: 'collection',
                    variation: 'full',
                    primary: {
                        handle: 'collection-handle'
                    }
                },
                {
                    slice_type: 'collection',
                    variation: 'default',
                    primary: {
                        handle: 'second-collection-handle',
                        limit: 8
                    }
                },
                {
                    slice_type: 'vendors'
                }
            ]
        } as any;

        beforeEach(() => {
            mockCollectionApi.mockReset();
            mockVendorsApi.mockReset();
        });

        it('should return an empty object if no page data is supplied', async () => {
            const result = await Prefetch({ api: mockApi });
            expect(result).toEqual({});
        });

        it('should prefetch collections', async () => {
            mockCollectionApi.mockResolvedValueOnce(mockCollection);

            const result = await Prefetch({ api: mockApi, page: mockPage });
            expect(mockCollectionApi).toHaveBeenCalledWith({
                api: mockApi,
                handle: 'collection-handle',
                limit: undefined
            });
            expect(result.collections).toEqual({
                'collection-handle': {
                    ...mockCollection,
                    products: {
                        edges: [
                            {
                                node: {
                                    ...mockCollection.products.edges[0].node,
                                    sellingPlanGroups: {
                                        edges: []
                                    }
                                }
                            }
                        ]
                    }
                }
            });
        });

        it('should limit the number of products fetched for limited collections', async () => {
            mockCollectionApi.mockResolvedValueOnce(mockCollection);

            const result = await Prefetch({ api: mockApi, page: mockPage });
            expect(mockCollectionApi).toHaveBeenCalledWith({
                api: mockApi,
                handle: 'second-collection-handle',
                limit: 8
            });
            expect(result.collections).toEqual({
                'collection-handle': {
                    ...mockCollection,
                    products: {
                        edges: [
                            {
                                node: {
                                    ...mockCollection.products.edges[0].node,
                                    sellingPlanGroups: {
                                        edges: []
                                    }
                                }
                            }
                        ]
                    }
                }
            });
        });

        it('should prefetch vendors', async () => {
            mockVendorsApi.mockResolvedValueOnce([mockVendor]);

            const result = await Prefetch({
                api: mockApi,
                page: {
                    ...mockPage,
                    slices: [
                        {
                            slice_type: 'vendors'
                        }
                    ] as any
                }
            });
            expect(mockVendorsApi).toHaveBeenCalledWith({ api: mockApi });
            expect(result.vendors).toEqual([mockVendor]);
        });

        it('should return initial data if supplied', async () => {
            const initialData: PrefetchData = {
                collections: {
                    'collection-handle': mockCollection,
                    'second-collection-handle': mockCollection
                },
                vendors: [mockVendor],
                shop: mockStore
            } as any;

            const result = await Prefetch({ api: mockApi, page: mockPage, initialData });
            expect(mockCollectionApi).not.toHaveBeenCalled();
            expect(mockVendorsApi).not.toHaveBeenCalled();
            expect(result).toEqual(initialData);
        });

        it('should reject if an error occurs', async () => {
            mockCollectionApi.mockRejectedValueOnce(new Error('Collection API error'));

            await expect(Prefetch({ api: mockApi, page: mockPage })).rejects.toThrow('Collection API error');
        });
    });
});
