import 'server-only';

import { Shop as RawShop } from '@nordcom/commerce-db';
import { cache } from 'react';

/**
 * Render-cached tenant lookup keyed on PRIMITIVE arguments.
 *
 * `cache()` keys on argument identity (Object.is per arg). The ubiquitous
 * `findByDomain(domain, { sensitiveData: true })` passes a fresh object literal
 * each call, so the key never matches and dedup silently degrades to nothing.
 * Flattening the options into primitives (and joining `populate` to a stable
 * string) makes equivalent calls collapse to a single Mongo round-trip per
 * render pass.
 *
 * Lives in its own leaf module — depending only on `@nordcom/commerce-db` and
 * `react` — so hot, foundational callers (api/shopify.ts) can route through it
 * without dragging in the rest of `_loaders`' entity/CMS graph.
 *
 * @param domain - Hostname to resolve.
 * @param sensitiveData - Whether to skip credential masking.
 * @param convert - Whether to return the normalized shape vs the raw lean doc.
 * @param populate - Comma-joined Mongoose population paths (empty string = none).
 * @returns The matched shop.
 * @throws {UnknownShopDomainError} When no shop claims the domain.
 * @throws {InvalidShopDomainError} When `domain` is empty.
 */
const cachedFindByDomain = cache(
    (
        domain: string,
        sensitiveData: boolean,
        convert: boolean,
        populate: string,
    ): ReturnType<typeof RawShop.findByDomain> =>
        RawShop.findByDomain(domain, {
            sensitiveData,
            convert,
            populate: populate ? populate.split(',') : [],
        }),
);

export const Shop = {
    /**
     * Tenant lookup by domain, normalizing options into the primitive cache key.
     *
     * @param domain - Hostname to resolve.
     * @param options - Forwarded find options; flattened into the cache key.
     * @returns The matched shop.
     * @throws {UnknownShopDomainError} When no shop claims the domain.
     * @throws {InvalidShopDomainError} When `domain` is empty.
     */
    findByDomain: (
        domain: string,
        options?: { convert?: boolean; sensitiveData?: boolean; populate?: string[] },
    ): ReturnType<typeof RawShop.findByDomain> =>
        cachedFindByDomain(
            domain,
            options?.sensitiveData ?? false,
            options?.convert ?? true,
            (options?.populate ?? []).join(','),
        ),
    // Defer the `findAll` lookup to call time (rather than `.bind` at module
    // init) so importing this leaf — now pulled in by the foundational
    // api/shopify.ts — never touches the method before the db package's `Shop`
    // singleton is ready.
    findAll: cache(() => RawShop.findAll()),
};
