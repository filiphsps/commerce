import { gql } from '@apollo/client';
import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import type { Brand } from '@shopify/hydrogen-react/storefront-api-types';
import type { AbstractApi } from '@/utils/abstract-api';

export const BrandApi = async ({ api }: { api: AbstractApi }) => {
    const shop = api.shop();

    const { data, errors } = await api.query<{ shop: { brand: Brand } }>(gql`
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

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    }

    if (!data) {
        throw new NotFoundError(`"Shop" on shop "${shop.id}"`);
    }

    return data.shop.brand;
};
