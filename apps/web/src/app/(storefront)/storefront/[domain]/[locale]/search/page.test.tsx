import { render } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { describe, vi } from 'vitest';
import { metadata as notFoundMetadata } from '../not-found';
import type { SearchPageParams } from './page';
import SearchPage, { generateMetadata } from './page';

describe('app', () => {
    describe('SearchPage', () => {
        vi.mock('@/utils/prefetch', () => ({
            Prefetch: vi.fn().mockResolvedValue({})
        }));
        vi.mock('@/i18n/dictionary', () => ({
            getDictionary: vi.fn().mockResolvedValue({})
        }));
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
                    locales: [{ locale: 'en-US', country: 'US', language: 'EN' }]
                }
            })
        }));

        vi.mock('next/navigation', () => ({
            notFound: vi.fn().mockReturnValue({}),
            useRouter: vi.fn().mockReturnValue({}),
            useSearchParams: vi.fn().mockReturnValue({ get: () => '' })
        }));
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

        const domain = 'example.com';
        const locale = 'en-US';
        const params: SearchPageParams = { domain, locale };

        describe('generateMetadata', () => {
            it('returns notFoundMetadata when locale is not valid', async () => {
                const metadata = await generateMetadata({ params: { domain, locale: 'invalid-locale' } });
                expect(metadata).toEqual({ ...notFoundMetadata });
            });

            it('returns expected metadata when locale is valid', async () => {
                const metadata = await generateMetadata({ params });
                expect(metadata).toEqual({
                    title: 'Search',
                    description: undefined,
                    alternates: {
                        canonical: `https://${domain}/${locale}/search/`,
                        languages: {
                            'en-US': 'https://example.com/en-US/search/'
                        }
                    },
                    openGraph: {
                        url: `/${locale}/search/`,
                        type: 'website',
                        title: 'Search',
                        description: undefined,
                        siteName: undefined,
                        locale: 'en-US',
                        images: undefined
                    }
                });
            });
        });

        it('returns notFound when locale is not valid', async () => {
            await SearchPage({ params: { domain, locale: 'invalid-locale' } });
            expect(notFound).toHaveBeenCalled();
        });

        it('should render', async () => {
            const result = await SearchPage({ params });
            const { container } = render(result);
            expect(container).not.toBeNull();
        });
    });
});
