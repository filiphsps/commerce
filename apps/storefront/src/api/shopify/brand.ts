import { NotFoundError, UnknownApiError } from '@nordcom/commerce-errors';

import { gql } from '@apollo/client';

import type { AbstractApi } from '@/utils/abstract-api';
import type { Brand } from '@shopify/hydrogen-react/storefront-api-types';

export const BrandApi = async ({ api }: { api: AbstractApi }) => {
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
                            altText
                            url(transform: { preferredContentType: WEBP })
                            height
                            width
                        }
                    }
                    squareLogo {
                        id
                        alt
                        image {
                            altText
                            url(transform: { preferredContentType: WEBP })
                            height
                            width
                        }
                    }
                    coverImage {
                        id
                        alt
                        image {
                            altText
                            url(transform: { preferredContentType: WEBP })
                            height
                            width
                        }
                    }
                    shortDescription
                    slogan
                }
            }
        }
    `);

    if (errors) {
        throw new UnknownApiError(errors.map((e) => e.message).join(', '));
    }

    if (!data) {
        throw new NotFoundError('"Shop"');
    }

    return data.shop.brand;
};
