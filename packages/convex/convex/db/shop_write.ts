import { ConvexError, v } from 'convex/values';

import { serverMutation } from '../_constructors';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { shopValidator } from '../tables/shops';
import { shopByPublicId } from './shops';

/**
 * Stable {@link ConvexError} codes for the atomic shop write, so the `packages/db` caller branches
 * on a code rather than string-matching messages.
 */
export const ShopWriteErrorCode = {
    /** An insert was requested without the minimum required `shops` row fields. */
    INCOMPLETE: 'SHOP_WRITE_INCOMPLETE',
    /** A collaborator entry referenced a string that is not a `users` document id. */
    INVALID_COLLABORATOR: 'SHOP_WRITE_INVALID_COLLABORATOR',
    /** A freshly-written row could not be read back inside the same transaction. */
    WRITE_READBACK_FAILED: 'SHOP_WRITE_READBACK_FAILED',
    /** The write's PRIMARY domain is already claimed by another shop (hard invariant; rolls back). */
    PRIMARY_DOMAIN_TAKEN: 'SHOP_WRITE_PRIMARY_DOMAIN_TAKEN',
    /** {@link deleteShop} was asked to remove a shop whose `legacyId` resolves to no row. */
    NOT_FOUND: 'SHOP_WRITE_NOT_FOUND',
    /** {@link deleteShop} refused because the shop still owns CMS content or reviews (purge those first). */
    NOT_EMPTY: 'SHOP_WRITE_NOT_EMPTY',
} as const;

const shopFields = shopValidator.fields;

/**
 * The writable `shops` surface of {@link upsertShop}: every caller-settable field of the table
 * validator (managed `legacyId`/timestamps excluded), with the required fields relaxed to optional
 * so ONE validator serves both the full-document insert and the merge-style partial update — the
 * handler re-asserts the required set on the insert path ({@link ShopWriteErrorCode.INCOMPLETE}).
 */
const writableShopValidator = v.object({
    name: v.optional(shopFields.name),
    description: shopFields.description,
    clerkOrgId: shopFields.clerkOrgId,
    domain: v.optional(shopFields.domain),
    alternativeDomains: shopFields.alternativeDomains,
    i18n: shopFields.i18n,
    commerce: shopFields.commerce,
    showProductVendor: shopFields.showProductVendor,
    design: v.optional(shopFields.design),
    theme: shopFields.theme,
    extensions: shopFields.extensions,
    icons: shopFields.icons,
    // businessData + branding are shop-row identity/presentation fields folded onto the shop (UNIFY-SHOP),
    // siblings of design/icons which are already writable here. The provisioning writer owns the initial
    // value (the canonical seed sets it); the admin's cms/shop_config path edits it thereafter.
    businessData: shopFields.businessData,
    branding: shopFields.branding,
    commerceProvider: v.optional(shopFields.commerceProvider),
    integrations: shopFields.integrations,
    thirdParty: shopFields.thirdParty,
});

type WritableShop = typeof writableShopValidator.type;

/**
 * What the atomic shop write hands back to the seam: the stored (public, secret-free) shop row plus
 * the post-sync collaborator join rows, so `packages/db` can re-embed `collaborators` in the frozen
 * `ShopBase` shape without a second call.
 */
export type ShopWriteView = {
    shop: Doc<'shops'>;
    collaborators: { user: string; permissions: string[] }[];
};

/**
 * Drops `undefined`-valued entries from a partial shop payload so merging it over an existing row
 * never erases a stored field, and an insert never persists explicit `undefined` values.
 *
 * @param shop - The validated writable-shop args.
 * @returns The same fields with `undefined` entries removed.
 */
function definedShopFields(shop: WritableShop): Partial<WritableShop> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(shop)) {
        if (typeof value !== 'undefined') {
            out[key] = value;
        }
    }
    return out as Partial<WritableShop>;
}

/**
 * `.unique()` over `shopDomains.by_domain`, degraded: domain uniqueness is a write-time invariant
 * (Convex indexes are not unique), so corrupted duplicate rows would make a real `.unique()` throw
 * on EVERY routing lookup site-wide. Instead the duplicate is logged and the first match wins,
 * keeping the platform routable while the corruption is surfaced.
 *
 * @param ctx - The mutation context (raw cross-tenant `db`).
 * @param domain - The hostname to look up.
 * @returns The first matching domain row, or `null` when the domain is unclaimed.
 */
async function uniqueDomainRow(ctx: MutationCtx, domain: string): Promise<Doc<'shopDomains'> | null> {
    const rows = await ctx.db
        .query('shopDomains')
        .withIndex('by_domain', (q) => q.eq('domain', domain))
        .take(2);
    if (rows.length > 1) {
        console.warn(`[shop_write] duplicate shopDomains rows for "${domain}"; degrading to first match.`);
    }
    return rows[0] ?? null;
}

/**
 * Reconciles the `shopDomains` routing rows to exactly the shop's desired domain set (delete-diff):
 * stale rows (a shrunk domain set) and same-shop duplicates are deleted, missing rows are inserted.
 * A contested domain (already owned by ANOTHER shop) is handled by tier: the PRIMARY `shop.domain`
 * is a hard invariant — it throws {@link ShopWriteErrorCode.PRIMARY_DOMAIN_TAKEN}, rolling back the
 * whole shop write, so a shop can never be created or renamed onto a taken primary (no silent
 * split-brain where the stored row claims the domain but routing still serves the incumbent). A
 * contested ALTERNATIVE stays best-effort — logged and skipped (first-match-wins) rather than
 * failing an otherwise-valid write over one additive hostname.
 *
 * @param ctx - The mutation context.
 * @param shopId - The shop whose routing rows to reconcile.
 * @param shop - The stored shop row the desired set derives from (primary + alternative domains).
 * @throws {ConvexError} `SHOP_WRITE_PRIMARY_DOMAIN_TAKEN` when the primary domain is claimed by another shop.
 */
async function reconcileDomains(ctx: MutationCtx, shopId: Id<'shops'>, shop: Doc<'shops'>): Promise<void> {
    const desired = new Set<string>([shop.domain, ...(shop.alternativeDomains ?? [])]);
    const current = await ctx.db
        .query('shopDomains')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .collect();

    const kept = new Set<string>();
    for (const row of current) {
        if (!desired.has(row.domain) || kept.has(row.domain)) {
            await ctx.db.delete(row._id);
            continue;
        }
        kept.add(row.domain);
    }

    for (const domain of desired) {
        if (kept.has(domain)) {
            continue;
        }
        const owner = await uniqueDomainRow(ctx, domain);
        if (owner && owner.shop !== shopId) {
            if (domain === shop.domain) {
                throw new ConvexError({
                    code: ShopWriteErrorCode.PRIMARY_DOMAIN_TAKEN,
                    message: `Primary domain "${domain}" is already claimed by another shop.`,
                });
            }
            console.warn(
                `[shop_write] alternative domain "${domain}" is already claimed by another shop; keeping the first match.`,
            );
            continue;
        }
        if (!owner) {
            await ctx.db.insert('shopDomains', { shop: shopId, domain, status: 'pending' });
        }
    }
}

/**
 * Reconciles the `shopCollaborators` join to exactly the desired membership list: removed users'
 * rows (and same-user duplicates) are deleted, changed permission sets are patched, and missing
 * memberships are inserted.
 *
 * @param ctx - The mutation context.
 * @param shopId - The shop whose collaborator rows to sync.
 * @param collaborators - The desired `{ user, permissions }` list; `user` is a users-row id string.
 * @throws {ConvexError} `SHOP_WRITE_INVALID_COLLABORATOR` when a `user` string is not a users id —
 *   thrown mid-transaction so the WHOLE shop write rolls back (all-or-nothing).
 */
async function syncCollaborators(
    ctx: MutationCtx,
    shopId: Id<'shops'>,
    collaborators: { user: string; permissions: string[] }[],
): Promise<void> {
    const desired = new Map<Id<'users'>, string[]>();
    for (const collaborator of collaborators) {
        const user = ctx.db.normalizeId('users', collaborator.user);
        if (!user) {
            throw new ConvexError({
                code: ShopWriteErrorCode.INVALID_COLLABORATOR,
                message: `Collaborator "${collaborator.user}" is not a users document id.`,
            });
        }
        desired.set(user, collaborator.permissions);
    }

    const current = await ctx.db
        .query('shopCollaborators')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .collect();

    const kept = new Set<Id<'users'>>();
    for (const row of current) {
        const permissions = desired.get(row.user);
        if (!permissions || kept.has(row.user)) {
            await ctx.db.delete(row._id);
            continue;
        }
        kept.add(row.user);
        if (JSON.stringify(permissions) !== JSON.stringify(row.permissions)) {
            await ctx.db.patch(row._id, { permissions });
        }
    }

    for (const [user, permissions] of desired) {
        if (!kept.has(user)) {
            await ctx.db.insert('shopCollaborators', { shop: shopId, user, permissions });
        }
    }
}

/**
 * THE single atomic shop write for the identity-less `packages/db` seam: one Convex transaction
 * upserts the `shops` row (keyed by the public `legacyId`), replaces the split-out
 * `shopCredentials` bag when one is provided, delete-diff-reconciles the `shopDomains` routing rows
 * against the (post-merge) primary + alternative domain set, and syncs the `shopCollaborators` join
 * when the write carries a membership list. Splitting any of these into a second mutation would
 * reintroduce cross-transaction races (e.g. a routable domain pointing at a half-written shop), so
 * the seam's single-mutation gate pins every `ShopService` write to exactly this call.
 *
 * Insert-vs-update semantics mirror Mongo `findOneAndUpdate`: with a `legacyId`, a missing shop is
 * only inserted when `upsert` is `true` (otherwise the call returns `null` and writes NOTHING);
 * without a `legacyId` (the `Shop.create` path), a fresh row is inserted and its `legacyId` is
 * minted as its own document id. Updates merge field-wise over the stored row (Mongo `$set`
 * parity); inserts must carry the full required field set.
 *
 * @returns The stored shop row plus its post-sync collaborator rows, or `null` when no shop matched
 *   and `upsert` was not requested.
 * @throws {ConvexError} `SHOP_WRITE_INCOMPLETE` when an insert lacks required fields;
 *   `SHOP_WRITE_INVALID_COLLABORATOR` when a collaborator id does not resolve (the transaction
 *   rolls back); `SHOP_WRITE_PRIMARY_DOMAIN_TAKEN` when the primary domain is claimed by another
 *   shop (rolls back); `SHOP_WRITE_READBACK_FAILED` when the written row cannot be read back.
 */
export const upsertShop = serverMutation({
    args: {
        legacyId: v.optional(v.string()),
        upsert: v.optional(v.boolean()),
        shop: writableShopValidator,
        credentials: v.optional(v.object({ token: v.optional(v.string()), clientSecret: v.optional(v.string()) })),
        collaborators: v.optional(v.array(v.object({ user: v.string(), permissions: v.array(v.string()) }))),
    },
    handler: async (ctx, { legacyId, upsert, shop, credentials, collaborators }): Promise<ShopWriteView | null> => {
        const now = Date.now();
        const fields = definedShopFields(shop);
        const existing = legacyId ? await shopByPublicId(ctx, legacyId) : null;

        let shopId: Id<'shops'>;
        if (existing) {
            const { _id, _creationTime, ...previous } = existing;
            await ctx.db.replace(_id, { ...previous, ...fields, updatedAt: now });
            shopId = _id;
        } else {
            if (legacyId && upsert !== true) {
                return null;
            }
            const { name, domain, design, commerceProvider } = shop;
            if (
                typeof name === 'undefined' ||
                typeof domain === 'undefined' ||
                typeof design === 'undefined' ||
                typeof commerceProvider === 'undefined'
            ) {
                throw new ConvexError({
                    code: ShopWriteErrorCode.INCOMPLETE,
                    message: 'Inserting a shop requires name, domain, design, and commerceProvider.',
                });
            }
            shopId = await ctx.db.insert('shops', {
                ...fields,
                name,
                domain,
                design,
                commerceProvider,
                legacyId: legacyId ?? '',
                createdAt: now,
                updatedAt: now,
            });
            if (!legacyId) {
                await ctx.db.patch(shopId, { legacyId: shopId });
            }
        }

        const stored = await ctx.db.get(shopId);
        if (!stored) {
            throw new ConvexError({
                code: ShopWriteErrorCode.WRITE_READBACK_FAILED,
                message: 'Written shop row could not be read back.',
            });
        }

        if (credentials) {
            const row = await ctx.db
                .query('shopCredentials')
                .withIndex('by_shop', (q) => q.eq('shop', shopId))
                .first();
            const bag = { shop: shopId, token: credentials.token, clientSecret: credentials.clientSecret };
            if (row) {
                await ctx.db.replace(row._id, bag);
            } else if (typeof credentials.token === 'string' || typeof credentials.clientSecret === 'string') {
                await ctx.db.insert('shopCredentials', bag);
            }
        }

        await reconcileDomains(ctx, shopId, stored);

        if (collaborators) {
            await syncCollaborators(ctx, shopId, collaborators);
        }

        const memberships = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_shop', (q) => q.eq('shop', shopId))
            .collect();
        return {
            shop: stored,
            collaborators: memberships.map((row) => ({ user: row.user as string, permissions: row.permissions })),
        };
    },
});

/**
 * The content-bearing tenant tables a shop owns through its `v.id('shops')` foreign key (`shopId`,
 * `by_shop`). {@link deleteShop} refuses to remove a shop while ANY of these hold a row, so a tenant
 * teardown can never silently orphan editorial data — the caller must purge content first. The
 * shop-keyed SIDE tables (routing/collaborators/credentials/flags) are NOT listed here: they are the
 * shop's own scaffolding and are cascaded by the delete itself.
 */
const SHOP_CONTENT_TABLES = ['cmsDocuments', 'cmsVersions', 'cmsMedia', 'cmsMediaDerivatives', 'reviews'] as const;

/**
 * The shop-keyed SIDE tables {@link deleteShop} cascades — the routing/collaborator/credential/flag
 * scaffolding that exists ONLY to support a shop, keyed by the `shop` foreign key (`by_shop`). Listed
 * apart from {@link SHOP_CONTENT_TABLES} because these are deleted with the shop rather than guarding it.
 */
const SHOP_SIDE_TABLES = ['shopDomains', 'shopCollaborators', 'shopCredentials', 'shopFeatureFlags'] as const;

/**
 * Atomically removes a shop and cascades its scaffolding side tables (`shopDomains`,
 * `shopCollaborators`, `shopCredentials`, `shopFeatureFlags`) in one transaction — the teardown
 * counterpart to {@link upsertShop}, keyed by the same public `legacyId`. Deleting the routing rows
 * with the shop is what frees the tenant's hostnames for reuse and stops the storefront resolving a
 * half-removed tenant.
 *
 * It deliberately does NOT cascade content: if the shop still owns any {@link SHOP_CONTENT_TABLES} row
 * (CMS documents/versions/media or reviews) the whole call throws {@link ShopWriteErrorCode.NOT_EMPTY}
 * and writes nothing, so a teardown can never silently orphan editorial data — the caller purges
 * content first. Clerk-owned org mirrors (`orgs`/`orgMemberships`) are left untouched: they belong to
 * the Clerk webhook, are shared across a multi-shop org, and are not a shop's to delete.
 *
 * @returns `{ deleted: <publicId> }` with the removed shop's public id, or `null` when no shop matches
 *   the `legacyId` and `missingOk` is set (an idempotent no-op for already-removed tenants).
 * @throws {ConvexError} `SHOP_WRITE_NOT_FOUND` when the `legacyId` resolves to no row and `missingOk`
 *   is not set; `SHOP_WRITE_NOT_EMPTY` when the shop still owns CMS content or reviews.
 */
export const deleteShop = serverMutation({
    args: { legacyId: v.string(), missingOk: v.optional(v.boolean()) },
    handler: async (ctx, { legacyId, missingOk }): Promise<{ deleted: string } | null> => {
        const shop = await shopByPublicId(ctx, legacyId);
        if (!shop) {
            if (missingOk === true) {
                return null;
            }
            throw new ConvexError({
                code: ShopWriteErrorCode.NOT_FOUND,
                message: `No shop matches legacyId "${legacyId}".`,
            });
        }

        for (const table of SHOP_CONTENT_TABLES) {
            const owned = await ctx.db
                .query(table)
                .withIndex('by_shop', (q) => q.eq('shopId', shop._id))
                .first();
            if (owned) {
                throw new ConvexError({
                    code: ShopWriteErrorCode.NOT_EMPTY,
                    message: `Shop "${legacyId}" still owns ${table} rows; purge its content before deleting.`,
                });
            }
        }

        for (const table of SHOP_SIDE_TABLES) {
            const rows = await ctx.db
                .query(table)
                .withIndex('by_shop', (q) => q.eq('shop', shop._id))
                .collect();
            for (const row of rows) {
                await ctx.db.delete(row._id);
            }
        }

        await ctx.db.delete(shop._id);
        return { deleted: shop.legacyId || shop._id };
    },
});
