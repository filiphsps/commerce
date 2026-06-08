import { ConvexError, v } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import { countWithinBudget } from '../lib/scan_budget';
import { tenantQuery } from '../lib/tenant';

/**
 * Stable string code carried on the {@link ConvexError} the list query throws past the addressable
 * page ceiling, so call sites and `convex-test` branch on the cause without string-matching. A
 * `ConvexError` payload with a stable code is the sanctioned in-isolate error contract (see
 * `cms/documents.ts`'s `CmsDocumentErrorCode`).
 */
export const CmsListErrorCode = {
    /** A page was requested beyond the last addressable page for the tenant/collection. */
    PAGE_OUT_OF_RANGE: 'CMS_LIST_PAGE_OUT_OF_RANGE',
} as const;

/**
 * Default page size when the caller omits one — mirrors the admin list view's historical Payload
 * `limit: 25`, so a migrated list renders the same window.
 */
const DEFAULT_PAGE_SIZE = 25;

/**
 * Hard upper bound on a caller-supplied page size. Caps how many documents a single page can pull (and
 * thus how deep the page-walk reads per step), keeping one request well inside the scan budget.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Normalizes a caller-supplied page size to a positive integer within `[1, MAX_PAGE_SIZE]`, falling
 * back to {@link DEFAULT_PAGE_SIZE} for absent or non-finite input.
 *
 * @param requested - The raw `pageSize` argument.
 * @returns A safe page size.
 */
function clampPageSize(requested: number | undefined): number {
    if (requested === undefined || !Number.isFinite(requested)) return DEFAULT_PAGE_SIZE;
    return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(requested)));
}

/**
 * Normalizes a caller-supplied 1-based page number to a positive integer, falling back to the first
 * page for absent or non-finite input.
 *
 * @param requested - The raw `page` argument.
 * @returns A 1-based page index `>= 1`.
 */
function normalizePage(requested: number | undefined): number {
    if (requested === undefined || !Number.isFinite(requested)) return 1;
    return Math.max(1, Math.floor(requested));
}

/**
 * The shape returned by {@link list}: the requested page's live documents plus the addressing metadata
 * (page coordinates, aggregate totals, and the stable cursors) the admin list view binds to.
 */
export type CmsListPage = {
    /** The live `cmsDocuments` rows on the requested page, newest first. */
    readonly docs: Doc<'cmsDocuments'>[];
    /** The 1-based page index actually served. */
    readonly page: number;
    /** The page size in force. */
    readonly pageSize: number;
    /** Total live documents for the tenant/collection, from a bounded counted scan. */
    readonly totalDocs: number;
    /** Last addressable page = `ceil(totalDocs / pageSize)`, at least 1. */
    readonly totalPages: number;
    /** The stable cursor that ADDRESSES this page (`null` for page 1); re-deriving page N yields the same value. */
    readonly cursor: string | null;
    /** The cursor that addresses the NEXT page, or `null` when this is the last page. */
    readonly continueCursor: string | null;
    /** Whether the requested page is the final page of results. */
    readonly isDone: boolean;
};

/**
 * Tenant-scoped, page-bounded admin list over a CMS collection's live documents — the Convex-native
 * replacement for Payload's `payload.find({ collection, page, limit })`. Built on {@link tenantQuery},
 * so the shop is pinned from server-trusted context and the RLS-wrapped reader confines every read to
 * that shop's own rows; a client `shopId` cannot widen the scope.
 *
 * Three guardrails distinguish it from a naive `.collect()`:
 * - `totalDocs` comes from {@link countWithinBudget}, which streams the tenant/collection rows and
 *   throws {@link BoundedScanExceededError} the instant the scan reaches its ceiling — so an
 *   over-large tenant fails loud rather than silently truncating.
 * - The requested page is range-checked against `totalPages`; a page past the last addressable page
 *   fails with a typed `CMS_LIST_PAGE_OUT_OF_RANGE` rather than returning an empty window.
 * - The page is reached by walking Convex's native cursor pagination from the start, returning the
 *   stable cursor that addresses the page (deterministic for fixed data) alongside the next-page cursor.
 *
 * @param ctx - The tenant query context (RLS-wrapped `db`, server-resolved `shopId`).
 * @param args - The `collection` slug, an optional 1-based `page`, and an optional `pageSize`.
 * @returns The {@link CmsListPage} for the requested page.
 * @throws {ConvexError} `CMS_LIST_PAGE_OUT_OF_RANGE` when `page` exceeds the last addressable page.
 * @throws {BoundedScanExceededError} When counting the tenant/collection reaches the scan budget.
 */
export const list = tenantQuery({
    args: {
        collection: v.string(),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
    },
    handler: async (ctx, { collection, page, pageSize }): Promise<CmsListPage> => {
        const size = clampPageSize(pageSize);
        const requestedPage = normalizePage(page);

        // A fresh, single-use query per read — the same indexed range is re-issued for the count and
        // for every page-walk step rather than reusing a drained iterator.
        const scoped = () =>
            ctx.db
                .query('cmsDocuments')
                .withIndex('by_shop_collection', (q) => q.eq('shopId', ctx.shopId).eq('collection', collection))
                .order('desc');

        const totalDocs = await countWithinBudget(scoped());
        const totalPages = Math.max(1, Math.ceil(totalDocs / size));

        if (requestedPage > totalPages) {
            throw new ConvexError({
                code: CmsListErrorCode.PAGE_OUT_OF_RANGE,
                message: `Page ${requestedPage} is past the last addressable page (${totalPages}).`,
                requestedPage,
                totalPages,
            });
        }

        let cursor: string | null = null;
        let result = await scoped().paginate({ numItems: size, cursor });
        for (let walked = 2; walked <= requestedPage; walked += 1) {
            cursor = result.continueCursor;
            result = await scoped().paginate({ numItems: size, cursor });
        }

        return {
            docs: result.page,
            page: requestedPage,
            pageSize: size,
            totalDocs,
            totalPages,
            cursor,
            continueCursor: result.isDone ? null : result.continueCursor,
            isDone: result.isDone,
        };
    },
});
