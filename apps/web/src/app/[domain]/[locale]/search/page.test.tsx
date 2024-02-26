import { describe, expect, it, vi } from 'vitest';

import type { PageApi as OriginalPageApi } from '@/api/page';
import { Locale } from '@/utils/locale';
import { render } from '@/utils/test/react';
import type { SearchPageParams } from './page';
import SearchPage, { generateMetadata } from './page';

describe('app', () => {
    describe('SearchPage', () => {
        vi.mock('@/i18n/dictionary', () => ({
            getDictionary: vi.fn().mockResolvedValue({})
        }));
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
            PageApi.preload = vi.fn().mockResolvedValue({});
            return {
                PageApi
            };
        });
        vi.mock('@/api/store', () => ({
            LocalesApi: vi.fn().mockResolvedValue([Locale.default]),
            StoreApi: vi.fn().mockResolvedValue({
                i18n: {
                    locales: [Locale.default]
                }
            })
        }));

        vi.mock('next/navigation', () => ({
            notFound: vi.fn().mockReturnValue({}),
            useRouter: vi.fn().mockReturnValue({}),
            useSearchParams: vi.fn().mockReturnValue({ get: () => '' }),
            usePathname: vi.fn().mockReturnValue('')
        }));
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
                }),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        const domain = 'staging.demo.nordcom.io';
        const locale = 'en-US';
        const params: SearchPageParams = { domain, locale };

        describe('generateMetadata', () => {
            it('returns expected metadata when locale is valid', async () => {
                const metadata = await generateMetadata({ params });
                expect(metadata).toEqual({
                    title: 'search',
                    description: undefined,
                    alternates: {
                        canonical: `https://${domain}/en-US/search/`,
                        languages: {
                            'en-US': `https://${domain}/en-US/search/`
                        }
                    },
                    openGraph: {
                        url: `/search/`,
                        type: 'website',
                        title: 'search',
                        description: undefined,
                        siteName: undefined,
                        locale: 'en-US',
                        images: undefined
                    }
                });
            });
        });

        it.skip('should render', async () => {
            const result = await SearchPage({ params });
            const wrapper = render(result);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
