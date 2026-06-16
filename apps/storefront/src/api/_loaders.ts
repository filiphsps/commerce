import 'server-only';

import { cacheTag } from 'next/cache';
import { cache } from 'react';

import { cache as shopifyCache, tenantRootTags } from '@/cache';

import { ArticleApi as _ArticleApi } from './article';
import { FooterApi as _FooterApi } from './footer';
import { HeaderApi as _HeaderApi } from './header';
import { InfoBarApi as _InfoBarApi } from './info-bar';
import { CollectionMetadataApi as _CollectionMetadataApi, ProductMetadataApi as _ProductMetadataApi } from './metadata';
import { PagesApi as _PagesApi } from './page';
import { SearchApi as _SearchApi } from './search';
import { BlogApi as _BlogApi } from './shopify/blog';
import { CollectionApi as _CollectionApi } from './shopify/collection';
import { ProductApi as _ProductApi } from './shopify/product';
import { CountriesApi as _CountriesApi, LocaleApi as _LocaleApi, LocalesApi as _LocalesApi } from './store';

/**
 * Wraps `cacheTag` and swallows the error when called outside a `'use cache'` boundary.
 *
 * @param tags - Cache tag strings to register with the current cache entry.
 */
const safeCacheTag = (...tags: string[]) => {
    try {
        cacheTag(...tags);
    } catch {
        // Called outside a `'use cache'` boundary (e.g., generateStaticParams).
        // Tag is only meaningful inside one, so silently skip.
    }
};

// The render-cached, primitive-keyed tenant loader lives in its own leaf module
// so foundational callers (api/shopify.ts) can reuse the exact same `cache()`
// instance — and therefore the same per-render dedup — without importing the
// rest of this module's entity/CMS graph.
export { Shop } from './_shop-loader';

/**
 * React-cached variant of `CountriesApi`; safe to call multiple times per render without redundant fetches.
 *
 * @param args - Arguments forwarded to the underlying `CountriesApi`.
 * @returns Promise resolving to the list of available countries.
 */
export const CountriesApi = cache((args: Parameters<typeof _CountriesApi>[0]) => _CountriesApi(args));
/**
 * React-cached variant of `LocaleApi`.
 *
 * @param args - Arguments forwarded to the underlying `LocaleApi`.
 * @returns Promise resolving to the current localization context, or `null` for non-Shopify providers.
 */
export const LocaleApi = cache((args: Parameters<typeof _LocaleApi>[0]) => _LocaleApi(args));
/**
 * React-cached variant of `LocalesApi`.
 *
 * @param args - Arguments forwarded to the underlying `LocalesApi`.
 * @returns Promise resolving to the list of available locales.
 * @throws {NoLocalesAvailableError} When the shop has no configured locales.
 */
export const LocalesApi = cache((args: Parameters<typeof _LocalesApi>[0]) => _LocalesApi(args));

/**
 * React-cached variant of `ProductApi` with Shopify product cache tags applied.
 *
 * @param args - Arguments forwarded to the underlying `ProductApi`.
 * @returns Promise resolving to a product result tuple.
 */
export const ProductApi = cache((args: Parameters<typeof _ProductApi>[0]) => {
    const shop = args.api.shop();
    const locale = args.api.locale();
    safeCacheTag(...shopifyCache.keys.product({ tenant: shop, qualifier: locale, handle: args.handle }).tags);
    return _ProductApi(args);
});

/**
 * React-cached variant of `CollectionApi` with Shopify collection cache tags applied.
 *
 * @param args - Arguments forwarded to the underlying `CollectionApi`.
 * @returns Promise resolving to the collection.
 * @throws {InvalidHandleError} When the collection handle is invalid.
 * @throws {ProviderFetchError} When the Shopify query returns errors.
 * @throws {NotFoundError} When no collection matches the handle.
 */
export const CollectionApi = cache((args: Parameters<typeof _CollectionApi>[0]) => {
    const shop = args.api.shop();
    const locale = args.api.locale();
    safeCacheTag(...shopifyCache.keys.collection({ tenant: shop, qualifier: locale, handle: args.handle }).tags);
    return _CollectionApi(args);
});

/**
 * React-cached variant of `BlogApi` (Shopify blog).
 *
 * @param args - Arguments forwarded to the underlying `BlogApi`.
 * @returns Promise resolving to a blog result tuple.
 */
export const BlogApi = cache((args: Parameters<typeof _BlogApi>[0]) => _BlogApi(args));
/**
 * React-cached variant of `ArticleApi` (CMS article overlay).
 *
 * @param args - Arguments forwarded to the underlying `ArticleApi`.
 * @returns Promise resolving to the CMS article, or `null` when none exists.
 */
export const ArticleApi = cache((args: Parameters<typeof _ArticleApi>[0]) => _ArticleApi(args));

/**
 * React-cached variant of `HeaderApi`.
 *
 * @param args - Arguments forwarded to the underlying `HeaderApi`.
 * @returns Promise resolving to the CMS header, or `null` when unseeded.
 */
export const HeaderApi = cache((args: Parameters<typeof _HeaderApi>[0]) => _HeaderApi(args));
/**
 * React-cached variant of `FooterApi`.
 *
 * @param args - Arguments forwarded to the underlying `FooterApi`.
 * @returns Promise resolving to the CMS footer, or `null` when unseeded.
 */
export const FooterApi = cache((args: Parameters<typeof _FooterApi>[0]) => _FooterApi(args));
/**
 * React-cached variant of `SearchApi`.
 *
 * @param args - Arguments forwarded to the underlying `SearchApi`.
 * @returns Promise resolving to the CMS search-landing singleton, or `null` when unseeded.
 */
export const SearchApi = cache((args: Parameters<typeof _SearchApi>[0]) => _SearchApi(args));
/**
 * React-cached variant of `InfoBarApi`.
 *
 * @param args - Arguments forwarded to the underlying `InfoBarApi`.
 * @returns Promise resolving to the business data, or `null` when unseeded.
 */
export const InfoBarApi = cache((args: Parameters<typeof _InfoBarApi>[0]) => _InfoBarApi(args));
/**
 * React-cached variant of `ProductMetadataApi`.
 *
 * @param args - Arguments forwarded to the underlying `ProductMetadataApi`.
 * @returns Promise resolving to the product metadata overlay, or `null` when absent.
 */
export const ProductMetadataApi = cache((args: Parameters<typeof _ProductMetadataApi>[0]) => _ProductMetadataApi(args));
/**
 * React-cached variant of `CollectionMetadataApi`.
 *
 * @param args - Arguments forwarded to the underlying `CollectionMetadataApi`.
 * @returns Promise resolving to the collection metadata overlay, or `null` when absent.
 */
export const CollectionMetadataApi = cache((args: Parameters<typeof _CollectionMetadataApi>[0]) =>
    _CollectionMetadataApi(args),
);
/**
 * React-cached variant of `PagesApi` with tenant root cache tags applied.
 *
 * @param args - Arguments forwarded to the underlying `PagesApi`.
 * @returns Promise resolving to the normalized page list result.
 */
export const PagesApi = cache((args: Parameters<typeof _PagesApi>[0]) => {
    safeCacheTag(...tenantRootTags(args.shop));
    return _PagesApi(args);
});
