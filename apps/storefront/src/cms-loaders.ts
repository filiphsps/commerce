import 'server-only';

import type { BlockLoaders } from '@nordcom/commerce-cms/blocks/render';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';

const toShop = ({ id, domain }: { id: string; domain: string }) => ({ id, domain });

/**
 * Build the BlockLoaders implementation used by @nordcom/commerce-cms's
 * BlockRenderer. The storefront stays responsible for translating CMS-side
 * block intent into Shopify queries — the CMS package stays Shopify-agnostic.
 *
 * Loaders return safe fallbacks (null, empty list) on miss so block render
 * components degrade gracefully rather than throwing into the page tree.
 */
export const buildBlockLoaders = (): BlockLoaders => ({
    loadCollection: async ({ shop, locale, handle, limit }) => {
        try {
            const api = await ShopifyApolloApiClient({
                shop: { ...toShop(shop), domain: shop.domain } as never,
                locale: { code: locale.code } as never,
            });
            const collection = await CollectionApi({ api, handle, first: limit });
            if (!collection) return null;
            const edges = ((collection as { products?: { edges?: Array<{ node: unknown }> } }).products?.edges ??
                []) as Array<{
                node: {
                    handle: string;
                    title: string;
                    featuredImage?: { url?: string };
                    priceRange?: { minVariantPrice?: { amount: string; currencyCode: string } };
                };
            }>;
            return {
                handle: (collection as { handle: string }).handle,
                title: (collection as { title: string }).title,
                description: (collection as { description?: string }).description,
                products: edges.map(({ node }) => ({
                    handle: node.handle,
                    title: node.title,
                    imageUrl: node.featuredImage?.url,
                    price: node.priceRange?.minVariantPrice
                        ? {
                              amount: node.priceRange.minVariantPrice.amount,
                              currencyCode: node.priceRange.minVariantPrice.currencyCode,
                          }
                        : undefined,
                })),
            };
        } catch (err) {
            if (!CommerceError.isNotFound(err)) console.error('[cms] loadCollection failed:', err);
            return null;
        }
    },
    loadVendors: async () => {
        // Vendors aren't exposed by a single canonical Shopify API in this repo.
        // Returning an empty list is the YAGNI-safe default; if a Vendors block is
        // actually used in production we can wire ProductsApi vendor aggregation here.
        return [];
    },
    loadOverview: async ({ shop, locale, source, handle, limit }) => {
        if (source !== 'collection' || !handle) return [];
        try {
            const api = await ShopifyApolloApiClient({
                shop: { ...toShop(shop), domain: shop.domain } as never,
                locale: { code: locale.code } as never,
            });
            const collection = await CollectionApi({ api, handle, first: limit });
            if (!collection) return [];
            const edges = ((collection as { products?: { edges?: Array<{ node: unknown }> } }).products?.edges ??
                []) as Array<{
                node: {
                    handle: string;
                    title: string;
                    featuredImage?: { url?: string };
                    priceRange?: { minVariantPrice?: { amount: string; currencyCode: string } };
                };
            }>;
            return edges.map(({ node }) => ({
                handle: node.handle,
                title: node.title,
                imageUrl: node.featuredImage?.url,
                price: node.priceRange?.minVariantPrice
                    ? {
                          amount: node.priceRange.minVariantPrice.amount,
                          currencyCode: node.priceRange.minVariantPrice.currencyCode,
                      }
                    : undefined,
            }));
        } catch (err) {
            if (!CommerceError.isNotFound(err)) console.error('[cms] loadOverview failed:', err);
            return [];
        }
    },
});
