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
    isLocaleBucket,
    localizedPathsFor,
    readLocalizedField,
} from './localization';
import { resolveMediaForRead } from './media';

/**
 * Storefront-facing CMS reads (SFREAD-12). The storefront getter path is identity-less — it runs
 * before any user identity exists — so every function here is a {@link serverQuery} gated by
 * `CONVEX_SERVER_SECRET`, scoped manually to the PUBLIC shop id the storefront holds (the migrated
 * Mongo id, resolved through `shopByPublicId` exactly like the `db/shops` seam).
 *
 * Reads serve ONLY `published` documents by default (drafts are editor-only) and reassemble each
 * row exactly like the editor runtime does: `cms_i18n` shreds are rehydrated first
 * (`readShreddedDocument`), then localized buckets collapse through the
 * `request → shop default → platform default` fallback chain. The result is the Payload-doc shape
 * the SFREAD-01 contract pins: `{ id, ...fields, _status, createdAt, updatedAt }` with ISO
 * timestamps.
 *
 * PUBLISHED CONTENT (G4FIX-01) resolves through the live row's `publishedVersionId`: the live
 * row's `data` is the WORKING DRAFT, so a draft save after a publish never changes what these
 * reads serve — the last-published `cmsVersions` snapshot stays pinned until the next publish.
 * Rows without the pointer (the ETL/seed shape, which predates it) serve their own `data`
 * unchanged — for those rows the live data IS the published content, byte-identical to before.
 * A never-published document (`status: 'draft'`) stays invisible to published reads.
 *
 * DRAFT READS (CMSDATA-09, the live-preview seam) are fail-closed by construction: the single-doc
 * readers accept an EXPLICIT `draft: true` flag that widens the row filter to include
 * `status: 'draft'` rows and serves the live row's `data` (the working draft) instead of the
 * published snapshot. The flag only exists behind the `CONVEX_SERVER_SECRET` gate every
 * {@link serverQuery} enforces, and the sole production caller — the storefront's dual-read
 * getters — sets it exclusively from `draftMode().isEnabled`, which in turn is toggled only by the
 * secret-checked `/api/cms-preview` activation route. Omitting the flag (every pre-existing call
 * site) serves published-only, byte-identical to before.
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
 * Collapses a document's localized fields to their active-locale values, mirroring
 * `reassembleLocalizedDocument` but tolerating BOTH storage shapes: a locale-keyed bucket
 * (`isLocaleBucket` — the registered-locale discriminator, G4FIX-02) resolves through the chain; a
 * plain (unbucketed, HARNESS-12-style) value passes through as already resolved. Non-localized
 * fields always pass through untouched.
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
 * The collections whose localized fields are NESTED, so the registry-driven top-level resolver
 * above cannot reach them — resolved by the DEEP walk ({@link resolveLocalizedDeep}) instead:
 * - the tenant singletons `header`/`footer` (array-embedded nav-item descriptions, the header's
 *   `localeSwitcher.label`, the footer's section titles — CMSGATE-01), and
 * - the block-bearing content collections (CMSGATE-02): the native editor buckets every
 *   `localized: true` leaf INSIDE `blocks` rows (an alert's title, a rich-text block's body, a
 *   media-grid caption), which the per-field registry can never reach, so a published page must
 *   deep-collapse to read back on the frozen `Page.blocks` contract shape, and
 * - every `seoGroup()` collection, `articles` included: G4FIX-03 moved SEO localization from the
 *   whole group to its text leaves (`seo.title`/`seo.description`/`seo.keywords`), which sit one
 *   level below the top-level registry's reach.
 * `businessData` carries no localized fields and stays on the top-level resolver to keep the
 * collapse surface minimal.
 */
const DEEP_LOCALIZED_COLLECTIONS = new Set([
    'header',
    'footer',
    'pages',
    'articles',
    'collectionMetadata',
    'productMetadata',
]);

/**
 * Recursively collapses localized buckets through the fallback chain — the CMSGATE-01 read seam
 * for the nested-localized singletons, SCHEMA-GATED since G4FIX-02: a value may collapse only when
 * its wildcard-normalized path (array indices become `*`) is a descriptor-derived localized path
 * (the generated `localized_paths.ts` registry) AND the value passes the registered-locale
 * {@link isLocaleBucket} discriminator. Content objects anywhere else — including locale-shaped
 * maps like `{ en, sv }` at non-localized paths and a bucket SLOT whose content is itself
 * locale-shaped — pass through byte-identical, as do plain (HARNESS-12-style) legacy values at
 * localized paths. A bucket empty for the whole chain resolves to `undefined`, and `undefined`
 * members are dropped from rebuilt objects (matching the top-level resolver's field omission)
 * while array slots keep `null` so sibling indices never shift.
 *
 * @param value - The value to walk (any depth).
 * @param chain - The ordered fallback chain from {@link buildLocaleFallbackChain}.
 * @param paths - The collection's localized path-pattern set from `localizedPathsFor`.
 * @param path - The wildcard-normalized path of `value` within the document.
 * @returns The value with every schema-localized bucket collapsed to its active-locale slot.
 */
function resolveLocalizedDeepValue(
    value: unknown,
    chain: readonly string[],
    paths: ReadonlySet<string>,
    path: string,
): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => {
            const resolved = resolveLocalizedDeepValue(item, chain, paths, `${path}.*`);
            return resolved === undefined ? null : resolved;
        });
    }
    if (typeof value === 'object' && value !== null) {
        if (paths.has(path) && isLocaleBucket(value)) return readLocalizedField(value, chain);
        const result: Record<string, unknown> = {};
        for (const [key, member] of Object.entries(value)) {
            const resolved = resolveLocalizedDeepValue(member, chain, paths, `${path}.${key}`);
            if (resolved !== undefined) result[key] = resolved;
        }
        return result;
    }
    return value;
}

/**
 * Deep-resolves a {@link DEEP_LOCALIZED_COLLECTIONS} document's field map through
 * {@link resolveLocalizedDeepValue}, preserving the top-level record shape and gating every
 * collapse on the collection's descriptor-derived localized paths (G4FIX-02).
 *
 * @param collection - The document's collection slug, selecting its localized path set.
 * @param data - The document's serialized field map.
 * @param chain - The ordered fallback chain.
 * @returns A new field map with every schema-localized nested bucket collapsed.
 */
function resolveLocalizedDeep(collection: string, data: unknown, chain: readonly string[]): Record<string, unknown> {
    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const paths = localizedPathsFor(collection);
    const result: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(record)) {
        const resolved = resolveLocalizedDeepValue(value, chain, paths, field);
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
 * Gathers the tenant's live documents for one collection through the budgeted
 * `by_shop_collection` range — the same bounded-scan posture as `cms/list.ts`, so a runaway tenant
 * fails typed instead of hitting Convex's hard read limit. Serves PUBLISHED rows only unless the
 * caller explicitly opts into drafts (the preview seam — see the module contract).
 *
 * @param ctx - The server query context.
 * @param scope - The resolved read scope.
 * @param collection - The collection slug to gather.
 * @param includeDrafts - When `true`, `status: 'draft'` rows are served too (draft-mode preview).
 * @returns The matching rows in index order.
 * @throws {BoundedScanExceededError} When the tenant/collection range exceeds the scan budget.
 */
async function liveDocs(
    ctx: QueryCtx,
    scope: CmsReadScope,
    collection: string,
    includeDrafts = false,
): Promise<Doc<'cmsDocuments'>[]> {
    const { items } = await collectWithinBudget(
        ctx.db
            .query('cmsDocuments')
            .withIndex('by_shop_collection', (q) => q.eq('shopId', scope.shop._id).eq('collection', collection)),
    );
    return items.filter((doc) => doc.status === 'published' || includeDrafts === true);
}

/**
 * Resolves the field map a read should serve for one live row (G4FIX-01):
 * - a DRAFT read serves the live row's `data` — the working draft `cms/documents:save` patches in
 *   place on every save;
 * - a PUBLISHED read resolves the `publishedVersionId` snapshot, so newer drafts never leak into
 *   live serving; a row without the pointer (the ETL/seed shape) serves its own `data`, for which
 *   the live data IS the published content. A dangling pointer (a deleted snapshot — never written
 *   by the mutation paths) falls back to `data` defensively rather than dropping the document.
 *
 * @param ctx - The server query context.
 * @param doc - The live `cmsDocuments` row.
 * @param draft - Whether this is a draft (preview) read.
 * @returns The serialized field map to serve.
 */
async function servedData(ctx: QueryCtx, doc: Doc<'cmsDocuments'>, draft: boolean): Promise<unknown> {
    if (draft || doc.publishedVersionId === undefined) return doc.data;
    const snapshot = await ctx.db.get(doc.publishedVersionId);
    return snapshot === null ? doc.data : snapshot.snapshot;
}

/**
 * The `_status` a read reports for one live row. Published reads always report `published` (the
 * snapshot served IS the published state). A draft read reports `draft` when the row never
 * published OR when the working draft has moved past the published snapshot — mirroring Payload's
 * `find({ draft: true })`, where the newest version's status is what the preview sees.
 *
 * @param doc - The live `cmsDocuments` row.
 * @param draft - Whether this is a draft (preview) read.
 * @returns The contract `_status` value.
 */
function servedStatus(doc: Doc<'cmsDocuments'>, draft: boolean): 'draft' | 'published' {
    if (!draft) return 'published';
    if (doc.status === 'draft') return 'draft';
    return doc.publishedVersionId !== undefined && doc.latestVersionId !== doc.publishedVersionId
        ? 'draft'
        : 'published';
}

/**
 * Reassembles one live document to the SFREAD-01 contract shape: resolve the served field map
 * ({@link servedData}), rehydrate `cms_i18n` shreds, collapse localized buckets for the request
 * chain, then frame with the Payload bookkeeping fields (`id`, `_status`, ISO
 * `createdAt`/`updatedAt`).
 *
 * @param ctx - The server query context.
 * @param doc - The live `cmsDocuments` row.
 * @param chain - The ordered locale fallback chain.
 * @param draft - Whether this is a draft (preview) read; defaults to the published view.
 * @returns The contract-shaped document.
 */
async function reassembleDoc(
    ctx: QueryCtx,
    doc: Doc<'cmsDocuments'>,
    chain: readonly string[],
    draft = false,
): Promise<CmsPublishedDoc> {
    const data = await servedData(ctx, doc, draft);
    const full = await readShreddedDocument(ctx.db, doc._id, data);
    const resolved = DEEP_LOCALIZED_COLLECTIONS.has(doc.collection)
        ? resolveLocalizedDeep(doc.collection, full, chain)
        : resolveLocalizedFields(doc.collection, full, chain);
    return {
        id: doc._id,
        ...resolved,
        _status: servedStatus(doc, draft),
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString(),
    };
}

/**
 * Finds the tenant's document whose SERVED `data[field]` equals `value` — the natural-key lookup
 * behind the slug/handle getters. The key fields (`slug`, `shopifyHandle`) are never localized or
 * shredded, so a plain comparison is total. The match runs against the view the read will serve
 * ({@link servedData}): a published lookup matches the published snapshot's key, so a draft that
 * renames a slug neither hides the published page nor exposes the draft slug to live traffic.
 * When both a published and a draft row carry the key under a draft read, the DRAFT row wins —
 * the preview exists to show the in-flight edit (the live-row model normally keeps one row per
 * document, so the tie is defensive, not a hot path).
 *
 * @param ctx - The server query context.
 * @param scope - The resolved read scope.
 * @param collection - The collection slug.
 * @param field - The natural-key field name.
 * @param value - The natural-key value to match.
 * @param includeDrafts - When `true`, draft rows participate in the lookup (preview seam).
 * @returns The matching row, or `null` when none matches.
 */
async function liveDocByKey(
    ctx: QueryCtx,
    scope: CmsReadScope,
    collection: string,
    field: string,
    value: string,
    includeDrafts = false,
): Promise<Doc<'cmsDocuments'> | null> {
    const docs = await liveDocs(ctx, scope, collection, includeDrafts);
    const matches: Doc<'cmsDocuments'>[] = [];
    for (const doc of docs) {
        const served = await servedData(ctx, doc, includeDrafts);
        const data = (typeof served === 'object' && served !== null ? served : {}) as Record<string, unknown>;
        if (data[field] === value) matches.push(doc);
    }
    return (includeDrafts ? matches.find((doc) => doc.status === 'draft') : undefined) ?? matches[0] ?? null;
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
 * addressing in `cms/actions.ts`). With `draft: true` (the preview seam) a draft row is served too,
 * preferred over a published sibling so the preview shows the in-flight edit.
 *
 * @returns The contract-shaped singleton, or `null` when unseeded or the shop is unresolved.
 */
export const singleton = serverQuery({
    args: {
        shopId: v.string(),
        collection: v.union(v.literal('header'), v.literal('footer'), v.literal('businessData')),
        locale: v.string(),
        draft: v.optional(v.boolean()),
    },
    handler: async (ctx, { shopId, collection, locale, draft }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const docs = await liveDocs(ctx, scope, collection, draft === true);
        const doc = (draft === true ? docs.find((row) => row.status === 'draft') : undefined) ?? docs[0];
        if (!doc) return null;
        const result = await reassembleDoc(ctx, doc, scope.chain, draft === true);
        // Populate the header's `logo` upload relation: the storefront receives a `Media` object,
        // not the stored media id (SFREAD-01 — uploads arrived populated under Payload). The
        // editor's media picker writes the id as a bare string, which the storefront's
        // `populatedMedia` discards; without this the admin-set logo never shows and the shop
        // record's placeholder stands in. A foreign, unparseable, or unset id collapses to `null`,
        // and the storefront falls back to the shop record's logo exactly as before.
        if (typeof result.logo === 'string') {
            result.logo = await resolveMediaForRead(ctx, scope.shop._id, result.logo);
        }
        return result;
    },
});

/**
 * Reads a published page by slug — the Convex shadow of `getPage`. `draft: true` (preview seam)
 * additionally serves the page's draft state, mirroring Payload's `find({ draft: true })`.
 *
 * @returns The contract-shaped page, or `null` when no matching page exists.
 */
export const pageBySlug = serverQuery({
    args: { shopId: v.string(), slug: v.string(), locale: v.string(), draft: v.optional(v.boolean()) },
    handler: async (ctx, { shopId, slug, locale, draft }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await liveDocByKey(ctx, scope, 'pages', 'slug', slug, draft === true);
        return doc ? reassembleDoc(ctx, doc, scope.chain, draft === true) : null;
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
        const rows = await liveDocs(ctx, scope, 'pages');
        const docs = await Promise.all(rows.map((doc) => reassembleDoc(ctx, doc, scope.chain)));
        docs.sort((a, b) => docKey(a, 'slug').localeCompare(docKey(b, 'slug')));
        return { docs };
    },
});

/**
 * Reads a published article by slug — the Convex shadow of `getArticle`. Shredded `body` buckets in
 * `cms_i18n` are rehydrated and locale-resolved before return. `draft: true` (preview seam) serves
 * the article's draft state too.
 *
 * @returns The contract-shaped article, or `null` when no matching article exists.
 */
export const articleBySlug = serverQuery({
    args: { shopId: v.string(), slug: v.string(), locale: v.string(), draft: v.optional(v.boolean()) },
    handler: async (ctx, { shopId, slug, locale, draft }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await liveDocByKey(ctx, scope, 'articles', 'slug', slug, draft === true);
        return doc ? reassembleDoc(ctx, doc, scope.chain, draft === true) : null;
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
        const rows = await liveDocs(ctx, scope, 'articles');
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
 * `getProductMetadata`. `draft: true` (preview seam) serves the overlay's draft state too.
 *
 * @returns The contract-shaped overlay, or `null` when no entry exists.
 */
export const productMetadataByHandle = serverQuery({
    args: { shopId: v.string(), handle: v.string(), locale: v.string(), draft: v.optional(v.boolean()) },
    handler: async (ctx, { shopId, handle, locale, draft }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await liveDocByKey(ctx, scope, 'productMetadata', 'shopifyHandle', handle, draft === true);
        return doc ? reassembleDoc(ctx, doc, scope.chain, draft === true) : null;
    },
});

/**
 * Reads the published collection-metadata overlay for a Shopify handle — the Convex shadow of
 * `getCollectionMetadata`. `draft: true` (preview seam) serves the overlay's draft state too.
 *
 * @returns The contract-shaped overlay, or `null` when no entry exists.
 */
export const collectionMetadataByHandle = serverQuery({
    args: { shopId: v.string(), handle: v.string(), locale: v.string(), draft: v.optional(v.boolean()) },
    handler: async (ctx, { shopId, handle, locale, draft }): Promise<CmsPublishedDoc | null> => {
        const scope = await resolveReadScope(ctx, shopId, locale);
        if (!scope) return null;
        const doc = await liveDocByKey(ctx, scope, 'collectionMetadata', 'shopifyHandle', handle, draft === true);
        return doc ? reassembleDoc(ctx, doc, scope.chain, draft === true) : null;
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
