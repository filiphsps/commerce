import { InvalidIDError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { parseGid } from '@shopify/hydrogen-react';
import type { Product } from '@/api/product';
import { cache } from '@/cache';
import type { AbstractApi } from '@/utils/abstract-api';

const PRODUCT_RECOMMENDATIONS_QUERY = graphql(`
    query productRecommendations($productId: ID!) {
        productRecommendations(productId: $productId, intent: RELATED) {
            id
            handle
            availableForSale
            encodedVariantExistence
            encodedVariantAvailability
            createdAt
            publishedAt
            isGiftCard
            requiresSellingPlan
            title
            description
            vendor
            productType
            tags
            trackingParameters
            seo {
                title
                description
            }
            priceRange {
                maxVariantPrice {
                    amount
                    currencyCode
                }
                minVariantPrice {
                    amount
                    currencyCode
                }
            }
            compareAtPriceRange {
                maxVariantPrice {
                    amount
                    currencyCode
                }
                minVariantPrice {
                    amount
                    currencyCode
                }
            }
            featuredImage {
                id
                altText
                url(transform: { preferredContentType: WEBP })
                height
                width
                thumbhash
            }
            images(first: 5) {
                edges {
                    node {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                        thumbhash
                    }
                }
            }
        }
    }
`);

// TODO: Migrate to the new recommendations api.
export const RecommendationApi = async ({ api, id }: { api: AbstractApi; id: string }): Promise<Product[]> => {
    const gid = parseGid(id);
    if (!gid.id) {
        throw new InvalidIDError(id);
    }

    const shop = api.shop();
    const { data, errors } = await api.query(
        PRODUCT_RECOMMENDATIONS_QUERY,
        { productId: id },
        { tags: [...cache.keys.product({ tenant: shop, handle: gid.id }).tags, 'recommendations'] },
    );

    if (errors && errors.length > 0) {
        throw new ProviderFetchError(errors);
    }
    if (!data?.productRecommendations || data.productRecommendations.length <= 0) {
        throw new NotFoundError(`"Recommendations" for "Product" with id "${id}" on shop "${shop.id}"`);
    }

    return data.productRecommendations as unknown as Product[];
};
