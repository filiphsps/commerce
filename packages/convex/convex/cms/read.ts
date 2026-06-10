import { v } from 'convex/values';

import { serverMutation, serverQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { shopByPublicId } from '../db/shops';
import { collectWithinBudget } from '../lib/scan_budget';
import { readShreddedDocument } from './i18n_shred';
import {
    buildLocaleFallbackChain,
    CMS_LOCALIZED_FIELDS_BY_COLLECTION,
    type LocalizedBucket,
    readLocalizedField,
} from './localization';

/**
 * Storefront-facing CMS reads (SFREAD-12). The storefront getter path is identity-less — it runs
 * before any user identity exists — so every function here is a {@link serverQuery} gated by
 * `CONVEX_SERVER_SECRET`, scoped manually to the PUBLIC shop id the storefront holds (the migrated
 * Mongo id, resolved through `shopByPublicId` exactly like the `db/shops` seam).
 *
 * Reads serve ONLY `published` documents (drafts are editor-only) and reassemble each row exactly
 * like the editor runtime does: `cms_i18n` shreds are rehydrated first (`readShreddedDocument`),
 * then localized buckets collapse through the `request → shop default → platform default` fallback
 * chain. The result is the Payload-doc shape the SFREAD-01 contract pins:
 * `{ id, ...fields, _status, createdAt, updatedAt }` with ISO timestamps.
 */

/**
 * A reassembled published document in the SFREAD-01 contract shape.
 */
export type CmsPublishedDoc = Record<string, unknown>;

/**
 * The resolved read scope for one storefront request: the tenant's `shops` row plus the locale
 * fallback chain anchored on its default locale.
 */
type CmsReadScope = {
    shop: Doc<'shops'>;
    chain: string[];
};

/**
 * Conservative shape test for a per-field localized bucket. Demands every key look like a locale
 * code AND either multiple slots or a region-tagged single slot (`en-US`), so unbucketed content
 * objects (an inline `seo` group's `{ title, description }`, a depth-0 `{ id }` relation — `id` is
 * the ISO 639-1 code for Indonesian) never false-positive. This tolerance is deliberate: the
 * HARNESS-12 seed rows store localized fields as PLAIN values (not buckets), and the read path
 * accepts both rather than rewriting the fixtures.
 *
 * @param value - Candidate localized-field value.
 * @returns `true` when the value is a locale-keyed bucket to resolve through the fallback chain.
 */
function isLocaleBucket(value: unknown): value is LocalizedBucket {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.length === 0) return false;
    if (!keys.every((key) => /^[a-z]{2,3}(-[A-Z]{2})?$/.test(key))) return false;
    return keys.length >= 2 || (keys[0]?.includes('-') ?? false);
}

/**
 * Collapses a document's localized fields to their active-locale values, mirroring
 * `reassembleLocalizedDocument` but tolerating BOTH storage shapes: a locale-keyed bucket resolves
 * through the chain; a plain (unbucketed, HARNESS-12-style) value passes through as already
 * resolved. Non-localized fields always pass through untouched.
 *
 * @param collection - The document's collection slug, selecting its localized field set.
 * @param data - The reassembled (shred-rehydrated) field map.
 * @param chain - The ordered fallback chain from {@link buildLocaleFallbackChain}.
 * @returns A new field map with every localized field resolved for the request locale.
 */
function resolveLocalizedFields(collection: string, data: unknown, chain: readonly string[]): Record<string, unknown> {
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const localized = new Set(CMS_LOCALIZED_FIELDS_BY_COLLECTION[collection] ?? []);
    const result: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(record)) {
        if (!localized.has(field) || !isLocaleBucket(value)) {
            result[field] = value;
            continue;
        }
        const resolved = readLocalizedField(value, chain);
        if (resolved !== undefined) result[field] = resolved;
    }
    return result;
}

/**
 * Resolves the read scope for a storefront request: the shop row by its public id and the locale
 * fallback chain anchored on the shop's default locale.
 *
 * @param ctx - The server query context (raw cross-tenant `db`).
 * @param shopId - The PUBLIC shop id string the storefront holds.
 * @param locale - The BCP-47 request locale.
 * @returns The scope, or `null` when no shop matches (the null-on-missing contract: never throw).
 */
async function resolveReadScope(ctx: QueryCtx, shopId: string, locale: string): Promise<CmsReadScope | null> {
    const shop = await shopByPublicId(ctx, shopId);
    if (!shop) return null;
    return { shop, chain: buildLocaleFallbackChain(locale, shop.i18n?.defaultLocale) };
}

/**
 * Gathers the tenant's PUBLISHED live documents for one collection through the budgeted
 * `by_shop_collection` range — the same bounded-scan posture as `cms/list.ts`, so a runaway tenant
 * fails typed instead of hitting Convex's hard read limit.
 *
 * @param ctx - The server query context.
 * @param scope - The resolved read scope.
 * @param collection - The collection slug to gather.
 * @returns The published rows in index order.
 * @throws {BoundedScanExceededError} When the tenant/collection range exceeds the scan budget.
 */
async function publishedDocs(ctx: QueryCtx, scope: CmsReadScope, collection: string): Promise<Doc<'cmsDocuments'>[]> {
    const { items } = await collectWithinBudget(
        ctx.db
            .query('cmsDocuments')
            .withIndex('by_shop_collection', (q) => q.eq('shopId', scope.shop._id).eq('collection', collection)),
    );
    return items.filter((doc) => doc.status === 'published');
}

/**
 * Reassembles one live document to the SFREAD-01 contract shape: rehydrate `cms_i18n` shreds,
 * collapse localized buckets for the request chain, then frame with the Payload bookkeeping fields
 * (`id`, `_status`, ISO `createdAt`/`updatedAt`).
 *
 * @param ctx - The server query context.
 * @param doc - The live `cmsDocuments` row.
 * @param chain - The ordered locale fallback chain.
 * @returns The contract-shaped document.
 */
async function reassembleDoc(
    ctx: QueryCtx,
    doc: Doc<'cmsDocuments'>,
    chain: readonly string[],
): Promise<CmsPublishedDoc> {
    const full = await readShreddedDocument(ctx.db, doc._id, doc.data);
    return {
        id: doc._id,
        ...resolveLocalizedFields(doc.collection, full, chain),
        _status: doc.status,
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString(),
    };
}

/**
 * Finds the tenant's published document whose inline `data[field]` equals `value` — the natural-key
 * lookup behind the slug/handle getters. The key fields (`slug`, `shopifyHandle`) are never
 * localized or shredded, so a plain inline comparison is total.
 *
 * @param ctx - The server query context.
 * @param scope - The resolved read scope.
 * @param collection - The collection slug.
 * @param field - The natural-key field name.
 * @param value - The natural-key value to match.
 * @returns The matching row, or `null` when none matches.
 */
async function publishedDocByKey(
    ctx: QueryCtx,
    scope: CmsReadScope,
    collection: string,
    field: string,
    value: string,
): Promise<Doc<'cmsDocuments'> | null> {
    const docs = await publishedDocs(ctx, scope, collection);
    return (
        docs.find((doc) => {
            const data = (typeof doc.data === 'object' && doc.data !== null ? doc.data : {}) as Record<string, unknown>;
            return data[field] === value;
        }) ?? null
    );
}

/**
 * Reads a natural-key string off a contract-shaped document for deterministic list ordering.
 *
 * @param doc - The contract-shaped document.
 * @param field - The key field to read.
 * @returns The key value, or an empty string when absent.
 */
function docKey(doc: CmsPublishedDoc, field: string): string {
    const value = doc[field];
    return typeof value === 'string' ? value : '';
}

/**
 * Reads a tenant singleton (`header`/`footer`/`businessData`) for the storefront. The tenant's
 * single published row for the collection IS the document (mirroring the editor's singleton upsert
 * addressing in `cms/actions.ts`).
 *
 * @returns The contract-shaped singleton, or `null` when unseeded or the shop is unresolved.
 */
export const singleton = serverQuery({
    args: {
        shopId: v.string(),
        collection: v.union(v.literal('header'), v.literal('footer'), v.literal('businessData')),
        locale: v.string(),
    },
    handler: async (ctx, { shopId, collection, locale }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = (await publishedDocs(ctx, scope, collection))[0];
        return doc ? reassembleDoc(ctx, doc, scope.chain) : null;
    },
});

/**
 * Reads a published page by slug — the Convex shadow of `getPage`.
 *
 * @returns The contract-shaped page, or `null` when no published page matches the slug.
 */
export const pageBySlug = serverQuery({
    args: { shopId: v.string(), slug: v.string(), locale: v.string() },
    handler: async (ctx, { shopId, slug, locale }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await publishedDocByKey(ctx, scope, 'pages', 'slug', slug);
        return doc ? reassembleDoc(ctx, doc, scope.chain) : null;
    },
});

/**
 * Lists the tenant's published pages — the Convex shadow of `getPages`. Sorted by slug so the
 * result is deterministic for the dual-read comparator regardless of insertion order; an unresolved
 * shop yields the never-drop empty list, matching the Mongo getter's sentinel behavior.
 *
 * @returns The contract-shaped pages, ordered by slug.
 */
export const pages = serverQuery({
    args: { shopId: v.string(), locale: v.string() },
    handler: async (ctx, { shopId, locale }): Promise<{ docs: CmsPublishedDoc[] }> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return { docs: [] };
        const rows = await publishedDocs(ctx, scope, 'pages');
        const docs = await Promise.all(rows.map((doc) => reassembleDoc(ctx, doc, scope.chain)));
        docs.sort((a, b) => docKey(a, 'slug').localeCompare(docKey(b, 'slug')));
        return { docs };
    },
});

/**
 * Reads a published article by slug — the Convex shadow of `getArticle`. Shredded `body` buckets in
 * `cms_i18n` are rehydrated and locale-resolved before return.
 *
 * @returns The contract-shaped article, or `null` when no published article matches the slug.
 */
export const articleBySlug = serverQuery({
    args: { shopId: v.string(), slug: v.string(), locale: v.string() },
    handler: async (ctx, { shopId, slug, locale }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await publishedDocByKey(ctx, scope, 'articles', 'slug', slug);
        return doc ? reassembleDoc(ctx, doc, scope.chain) : null;
    },
});

/**
 * Lists the tenant's published articles — the Convex shadow of `getArticles`. Supports the same
 * exact-tag filter and `publishedAt`-descending ordering as the Mongo getter so a flipped listing
 * serves the same window.
 *
 * @returns The contract-shaped articles, newest `publishedAt` first.
 */
export const articles = serverQuery({
    args: { shopId: v.string(), locale: v.string(), tag: v.optional(v.string()) },
    handler: async (ctx, { shopId, locale, tag }): Promise<{ docs: CmsPublishedDoc[] }> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return { docs: [] };
        const rows = await publishedDocs(ctx, scope, 'articles');
        let docs = await Promise.all(rows.map((doc) => reassembleDoc(ctx, doc, scope.chain)));
        if (tag !== undefined) {
            docs = docs.filter((doc) => Array.isArray(doc.tags) && (doc.tags as unknown[]).includes(tag));
        }
        docs.sort((a, b) => docKey(b, 'publishedAt').localeCompare(docKey(a, 'publishedAt')));
        return { docs };
    },
});

/**
 * Reads the published product-metadata overlay for a Shopify handle — the Convex shadow of
 * `getProductMetadata`.
 *
 * @returns The contract-shaped overlay, or `null` when no entry exists.
 */
export const productMetadataByHandle = serverQuery({
    args: { shopId: v.string(), handle: v.string(), locale: v.string() },
    handler: async (ctx, { shopId, handle, locale }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await publishedDocByKey(ctx, scope, 'productMetadata', 'shopifyHandle', handle);
        return doc ? reassembleDoc(ctx, doc, scope.chain) : null;
    },
});

/**
 * Reads the published collection-metadata overlay for a Shopify handle — the Convex shadow of
 * `getCollectionMetadata`.
 *
 * @returns The contract-shaped overlay, or `null` when no entry exists.
 */
export const collectionMetadataByHandle = serverQuery({
    args: { shopId: v.string(), handle: v.string(), locale: v.string() },
    handler: async (ctx, { shopId, handle, locale }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await publishedDocByKey(ctx, scope, 'collectionMetadata', 'shopifyHandle', handle);
        return doc ? reassembleDoc(ctx, doc, scope.chain) : null;
    },
});

/**
 * Upper bound on a persisted divergence `detail`, so a pathological diff or error message can never
 * push a ledger row toward the Convex document ceiling.
 */
const MAX_DIVERGENCE_DETAIL_LENGTH = 2_000;

/**
 * Appends one row to the SFREAD-12 divergence ledger (`cmsReadDivergence`). Called fire-and-forget
 * by the storefront's dual-read shadow; the write is intentionally append-only so the bake report
 * sees the full divergence history per getter.
 *
 * @returns Resolves once the row is persisted.
 */
export const recordDivergence = serverMutation({
    args: {
        shop: v.string(),
        getter: v.string(),
        kind: v.union(v.literal('mismatch'), v.literal('error')),
        locale: v.string(),
        key: v.optional(v.string()),
        detail: v.optional(v.string()),
    },
    handler: async (ctx, { shop, getter, kind, locale, key, detail }): Promise<null> => {
        await ctx.db.insert('cmsReadDivergence', {
            shop,
            getter,
            kind,
            locale,
            key,
            detail: detail === undefined ? undefined : detail.slice(0, MAX_DIVERGENCE_DETAIL_LENGTH),
            createdAt: Date.now(),
        });
        return null;
    },
});
