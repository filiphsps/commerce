import { InvalidIDError, NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { parseGid } from '@shopify/hydrogen-react';
import type { Product } from '@/api/product';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product-fragments';
import { cache } from '@/cache';
import type { AbstractApi } from '@/utils/abstract-api';
import { unsafe_cast } from '@/utils/unsafe-cast';

// ProductCard renders `firstAvailableVariant(product)` and (client-side)
// `getProductOptions(product)`, both of which require options, variants,
// selectedOrFirstAvailableVariant, and adjacentVariants. Without them the
// card content silently renders `null`, leaving an empty "You may also
// like" row. Use the shared ProductMinimal fragment so the recommendation
// payload matches collection-card payloads.
const PRODUCT_RECOMMENDATIONS_QUERY = graphql(
    `
    query productRecommendations($productId: ID!) {
        productRecommendations(productId: $productId, intent: RELATED) {
            ...ProductMinimal
        }
    }
`,
    [PRODUCT_FRAGMENT_MINIMAL],
);

/**
 * Fetches related product recommendations from Shopify for a given product GID.
 *
 * @param options - Options object.
 * @param options.api - Storefront API client.
 * @param options.id - Shopify product GID (e.g. `"gid://shopify/Product/123"`).
 * @returns Array of recommended products.
 * @throws {InvalidIDError} When `id` cannot be parsed as a valid GID.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When no recommendations are returned.
 */
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

    // hydrogen-react types `productRecommendations` as RecursivePartial<Product>[];
    // the Storefront API guarantees all queried fields are present at runtime.
    return unsafe_cast<Product[]>(data.productRecommendations);
};
