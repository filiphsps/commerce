import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

/**
 * Constructor-free home for the domain→shop routing primitives so BOTH the `db/shops` query layer
 * (which imports `_constructors`) and `lib/auth`'s authorization gate can reuse them without dragging
 * the constructor module — and its `lib/authed`/`lib/tenant` → `lib/auth` back-edges — into a circular
 * import that would leave `serverQuery` unresolved at module-eval time. These functions touch only
 * `ctx.db`, never a constructor, so they live below the constructor tier.
 */

/**
 * Resolves the `shopDomains` routing row claiming a hostname through the `by_domain` index — the
 * de-embedded analogue of the Mongo `$or: [{ domain }, { alternativeDomains: domain }]` scan, since
 * every primary AND alternative domain owns its own `shopDomains` row. Returns the row itself (not the
 * shop) so a caller can distinguish "no shop claims this domain" (null row) from "the routing row
 * exists but its `shop` FK is dangling" ({@link shopByDomain} returns null on a present row) — a
 * distinction the admin authorization gate reports as separate errors.
 *
 * @param ctx - A read context exposing `db` (raw cross-tenant reader).
 * @param domain - Fully-qualified hostname (no scheme, no port).
 * @returns The matching `shopDomains` row, or `null` when no shop claims the domain.
 */
export async function shopDomainRow(ctx: Pick<QueryCtx, 'db'>, domain: string): Promise<Doc<'shopDomains'> | null> {
    return ctx.db
        .query('shopDomains')
        .withIndex('by_domain', (q) => q.eq('domain', domain))
        .first();
}

/**
 * Resolves a shop by any routable hostname through the `shopDomains.by_domain` index. The Mongo
 * `$or: [{ domain }, { alternativeDomains: domain }]` collection scan collapses into this single
 * indexed lookup because every shop's primary domain AND each alternative domain owns its own
 * `shopDomains` row. The single source of the domain→shop routing read, reused by the admin
 * authorization gate (`lib/auth:resolveShopAccess`) so the lookup lives in exactly one place.
 *
 * @param ctx - A read context exposing `db` (raw cross-tenant reader).
 * @param domain - Fully-qualified hostname (no scheme, no port).
 * @returns The owning shop row, or `null` when no shop claims the domain (or its routing row dangles).
 */
export async function shopByDomain(ctx: Pick<QueryCtx, 'db'>, domain: string): Promise<Doc<'shops'> | null> {
    const row = await shopDomainRow(ctx, domain);
    if (!row) {
        return null;
    }
    return ctx.db.get(row.shop);
}
