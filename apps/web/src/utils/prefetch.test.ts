import { VendorsApi } from '@/api/shopify/vendor';
import type { VendorModel } from '@/models/VendorModel';
import type { CollectionPageDocumentData } from '@/prismic/types';
import type { AbstractApi } from '@/utils/abstract-api';
import type { PrefetchData } from '@/utils/prefetch';
import { Prefetch } from '@/utils/prefetch';
import type { MockedFunction } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/shopify/vendor');

const mockVendorsApi = VendorsApi as MockedFunction<typeof VendorsApi>;

describe('utils', () => {
    describe('Prefetch', () => {
        beforeEach(() => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(console, 'error').mockImplementation(() => {});
        });

        const mockApi = {
            shop: () => ({
                id: 'mock-shop-id',
                domains: {
                    primary: 'staging.demo.nordcom.io',
                    alternatives: []
                }
            })
        } as any as AbstractApi;
        const mockVendor: VendorModel = {
            id: '123',
            name: 'Vendor Name'
        } as any;
        const mockPage: CollectionPageDocumentData = {
            id: '123',
            uid: 'collection-page',
            type: 'collection',
            slices: [
                {
                    slice_type: 'vendors'
                }
            ]
        } as any;

        beforeEach(() => {
            mockVendorsApi.mockReset();
        });

        it('should return an empty object if no page data is supplied', async () => {
            const result = await Prefetch({ api: mockApi });
            expect(result).toEqual({});
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
                vendors: [mockVendor]
            } as any;

            const result = await Prefetch({ api: mockApi, page: mockPage, initialData });
            expect(mockVendorsApi).not.toHaveBeenCalled();
            expect(result).toEqual(initialData);
        });

        it('should reject if an error occurs', async () => {
            mockVendorsApi.mockRejectedValueOnce(new Error('API error'));

            await expect(
                Prefetch({
                    api: mockApi,
                    page: {
                        ...mockPage,
                        slices: [
                            {
                                slice_type: 'vendors'
                            }
                        ] as any
                    }
                })
            ).rejects.toThrow('API error');
        });
    });
});
