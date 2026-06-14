import { v } from 'convex/values';

import { serverQuery } from '../_constructors';
import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

/**
 * A shop row paired with its resolved feature flags — the read unit the `packages/db` seam
 * reconstructs `ShopBase`/`OnlineShop` from. The flags ride alongside (rather than embedded) because
 * the Mongo `featureFlags.flag` populate became the `shopFeatureFlags` join; the seam re-embeds them
 * as `featureFlags: [{ flag }]` to preserve the frozen shape.
 */
export type ShopReadView = {
    shop: Doc<'shops'>;
    flags: Doc<'featureFlags'>[];
};

/**
 * The split-out commerce-provider secrets re-attached out-of-band for the credentialed hot path —
 * the Convex parity of `Shop.findByDomain({ sensitiveData: true })`. Mirrors `cms/secrets.ts`'s
 * `SensitiveShopView` contract: secrets ride in a separate bag, never grafted onto the public row.
 */
export type SensitiveShopReadView = ShopReadView & {
    credentials: { token?: string; clientSecret?: string };
};

/**
 * One collaborated shop with the full collaborator join rows for that shop, preserving the embedded
 * `collaborators: [{ user, permissions }]` shape `Shop.findByCollaborator` returns. `user` is the
 * users-row id string — the same string the seam surfaces as `user.id`.
 */
export type CollaboratedShopView = {
    shop: Doc<'shops'>;
    collaborators: { user: string; permissions: string[] }[];
};

/**
 * Resolves a shop by any routable hostname through the `shopDomains.by_domain` index. The Mongo
 * `$or: [{ domain }, { alternativeDomains: domain }]` collection scan collapses into this single
 * indexed lookup because every shop's primary domain AND each alternative domain owns its own
 * `shopDomains` row.
 *
 * @param ctx - The server query context (raw cross-tenant `db`).
 * @param domain - Fully-qualified hostname (no scheme, no port).
 * @returns The owning shop row, or `null` when no shop claims the domain.
 */
async function shopByDomain(ctx: QueryCtx, domain: string): Promise<Doc<'shops'> | null> {
    const row = await ctx.db
        .query('shopDomains')
        .withIndex('by_domain', (q) => q.eq('domain', domain))
        .first();
    if (!row) {
        return null;
    }
    return ctx.db.get(row.shop);
}

/**
 * Resolves a shop by its PUBLIC id — the migrated Mongo `ObjectId` preserved as `legacyId` (the value
 * the seam projects to `shop.id`) — falling back to a direct Convex id lookup for rows created after
 * the migration whose `legacyId` is their own document id.
 *
 * @param ctx - The server query context.
 * @param id - The public shop id string.
 * @returns The shop row, or `null` when neither lookup resolves.
 */
export async function shopByPublicId(ctx: QueryCtx, id: string): Promise<Doc<'shops'> | null> {
    const byLegacy = await ctx.db
        .query('shops')
        .withIndex('by_legacy_id', (q) => q.eq('legacyId', id))
        .first();
    if (byLegacy) {
        return byLegacy;
    }
    const normalized = ctx.db.normalizeId('shops', id);
    return normalized ? ctx.db.get(normalized) : null;
}

/**
 * Loads a shop's feature flags through the `shopFeatureFlags` join — the resolved analogue of the
 * Mongo `populate('featureFlags.flag')` path, so the seam always hands consumers populated flags.
 *
 * @param ctx - The server query context.
 * @param shopId - The shop whose joined flags to resolve.
 * @returns The flag rows joined to the shop; dangling joins are skipped.
 */
async function loadShopFlags(ctx: QueryCtx, shopId: Id<'shops'>): Promise<Doc<'featureFlags'>[]> {
    const joins = await ctx.db
        .query('shopFeatureFlags')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .collect();
    const flags: Doc<'featureFlags'>[] = [];
    for (const join of joins) {
        const flag = await ctx.db.get(join.flag);
        if (flag) {
            flags.push(flag);
        }
    }
    return flags;
}

/**
 * Loads a shop's split-out credentials as a (possibly empty) secrets bag.
 *
 * @param ctx - The server query context.
 * @param shopId - The shop whose `shopCredentials` row to read.
 * @returns The secrets bag; empty when the shop has no credentials row.
 */
async function loadShopCredentials(ctx: QueryCtx, shopId: Id<'shops'>): Promise<SensitiveShopReadView['credentials']> {
    const row = await ctx.db
        .query('shopCredentials')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .first();
    return { token: row?.token, clientSecret: row?.clientSecret };
}

/**
 * The PUBLIC (masked) hostname → shop read backing `Shop.findByDomain`. The shop row physically
 * carries no secret (CONVEXCORE-04 shredded `token`/`clientSecret` into `shopCredentials`, which this
 * query never touches), so the public payload structurally cannot leak a credential.
 *
 * @returns The shop with its resolved flags, or `null` when no shop claims the domain.
 */
export const byDomain = serverQuery({
    args: { domain: v.string() },
    handler: async (ctx, { domain }): Promise<ShopReadView | null> => {
        const shop = await shopByDomain(ctx, domain);
        if (!shop) {
            return null;
        }
        return { shop, flags: await loadShopFlags(ctx, shop._id) };
    },
});

/**
 * The credentialed hostname → shop read backing `Shop.findByDomain({ sensitiveData: true })` — the
 * storefront's Shopify-client hot path. Joins the 1:1 `shopCredentials` row out-of-band; only a
 * caller holding `CONVEX_SERVER_SECRET` is admitted by the constructor.
 *
 * @returns The shop, its flags, and its secrets bag, or `null` when no shop claims the domain.
 */
export const byDomainWithCredentials = serverQuery({
    args: { domain: v.string() },
    handler: async (ctx, { domain }): Promise<SensitiveShopReadView | null> => {
        const shop = await shopByDomain(ctx, domain);
        if (!shop) {
            return null;
        }
        return {
            shop,
            flags: await loadShopFlags(ctx, shop._id),
            credentials: await loadShopCredentials(ctx, shop._id),
        };
    },
});

/**
 * Public-id → shop read backing `Shop.findById`. Resolves through `by_legacy_id` so the ~183-importer
 * `shop.id` contract (the migrated Mongo id) keeps working; the Convex `_id` is never the lookup key
 * a consumer holds.
 *
 * @returns The shop with its resolved flags, or `null` when the id resolves to no row.
 */
export const byId = serverQuery({
    args: { id: v.string() },
    handler: async (ctx, { id }): Promise<ShopReadView | null> => {
        const shop = await shopByPublicId(ctx, id);
        if (!shop) {
            return null;
        }
        return { shop, flags: await loadShopFlags(ctx, shop._id) };
    },
});

/**
 * User → shops read backing `Shop.findByCollaborator`, walking the de-embedded `shopCollaborators`
 * join via `by_user` and re-attaching each shop's full collaborator list (the embedded shape the
 * seam's `OnlineShop.collaborators` preserves).
 *
 * @returns The user's collaborated shops; empty when the id is not a users id or has no memberships.
 */
export const byCollaborator = serverQuery({
    args: { userId: v.string() },
    handler: async (ctx, { userId }): Promise<CollaboratedShopView[]> => {
        const user = ctx.db.normalizeId('users', userId);
        if (!user) {
            return [];
        }
        const memberships = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_user', (q) => q.eq('user', user))
            .collect();
        const views: CollaboratedShopView[] = [];
        for (const membership of memberships) {
            const shop = await ctx.db.get(membership.shop);
            if (!shop) {
                continue;
            }
            const rows = await ctx.db
                .query('shopCollaborators')
                .withIndex('by_shop', (q) => q.eq('shop', membership.shop))
                .collect();
            views.push({
                shop,
                collaborators: rows.map((row) => ({ user: row.user as string, permissions: row.permissions })),
            });
        }
        return views;
    },
});

/**
 * Cross-tenant shop listing backing `Shop.findAll` (storefront middleware's known-domain sweep and
 * static-params fan-out). Returns bare rows — flags and collaborators are not needed on this path.
 *
 * @returns Every shop row.
 */
export const findAll = serverQuery({
    args: {},
    handler: async (ctx): Promise<Doc<'shops'>[]> => ctx.db.query('shops').collect(),
});

/**
 * Reads the raw connection state of a single routable domain (status/via/timestamps) through the
 * `shopDomains.by_domain` hot index. Returns `null` when the domain has no routing row. Coalescing
 * of legacy rows (absent `status`) happens in the `packages/db` seam, not here, so this stays thin.
 *
 * @returns The row's `{ domain, status?, via?, verifiedAt?, lastCheckedAt? }`, or `null`.
 */
export const domainVerification = serverQuery({
    args: { domain: v.string() },
    handler: async (
        ctx,
        { domain },
    ): Promise<Pick<Doc<'shopDomains'>, 'domain' | 'status' | 'via' | 'verifiedAt' | 'lastCheckedAt'> | null> => {
        const row = await ctx.db
            .query('shopDomains')
            .withIndex('by_domain', (q) => q.eq('domain', domain))
            .first();
        if (!row) {
            return null;
        }
        return {
            domain: row.domain,
            status: row.status,
            via: row.via,
            verifiedAt: row.verifiedAt,
            lastCheckedAt: row.lastCheckedAt,
        };
    },
});
