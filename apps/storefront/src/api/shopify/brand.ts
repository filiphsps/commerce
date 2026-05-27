import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import type { AbstractApi } from '@/utils/abstract-api';

const BRAND_QUERY = graphql(`
    query brand {
        shop {
            brand {
                colors {
                    primary {
                        background
                        foreground
                    }
                    secondary {
                        background
                        foreground
                    }
                }
                logo {
                    id
                    alt
                    image {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                        thumbhash
                    }
                }
                squareLogo {
                    id
                    alt
                    image {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                        thumbhash
                    }
                }
                coverImage {
                    id
                    alt
                    image {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                        thumbhash
                    }
                }
                shortDescription
                slogan
            }
        }
    }
`);

/**
 * Fetches the Shopify brand assets (logo, colors, cover image, slogan) for the active tenant.
 *
 * @param options - Options object.
 * @param options.api - Storefront API client.
 * @returns The brand object from the Shopify Storefront API.
 * @throws {ProviderFetchError} When the Storefront API returns errors.
 * @throws {NotFoundError} When the shop record is absent from the response.
 */
export const BrandApi = async ({ api }: { api: AbstractApi }) => {
    const shop = api.shop();

    const { data, errors } = await api.query(BRAND_QUERY);

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    }

    if (!data) {
        throw new NotFoundError(`"Shop" on shop "${shop.id}"`);
    }

    return data.shop.brand;
};
