import { ConvexError } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import { resolveAdminShopId } from '../lib/auth';
import { systemQuery } from '../lib/system';
import { tenantQuery } from '../lib/tenant';
import { type CmsAuthContext, isAdmin } from './access';

/**
 * The two masked commerce-provider secret paths, kept in lockstep with the Payload-side
 * `SHOP_SECRET_PATHS` in `@nordcom/commerce-cms`'s `collections/shops/secrets.ts`. CONVEXCORE-04
 * physically shreds these off the public `shops` row into the 1:1 `shopCredentials` table, so a public
 * read can never carry them; these constants name the contract the strip/attach helpers honor.
 */
export const SHOP_SECRET_PATHS = [
    'commerceProvider.authentication.token',
    'commerceProvider.authentication.customers.clientSecret',
] as const;

/**
 * Stable string codes carried on every {@link ConvexError} this module throws, so call sites and
 * `convex-test` branch on the cause without string-matching messages. Convex functions run in the
 * Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a `ConvexError`
 * payload with a stable code is the sanctioned in-runtime error contract (the same pattern as
 * `cms/access.ts`'s `CmsAccessErrorCode`).
 */
export const ShopSecretErrorCode = {
    /** {@link resolveAdminShopId} returned a `shopId` whose `shops` row no longer exists. */
    SHOP_NOT_FOUND: 'SHOP_NOT_FOUND',
} as const;

/**
 * The split-out commerce-provider secrets a shop may carry, mirroring the optional
 * `shopCredentials.{token,clientSecret}` columns. Both optional: a shop may hold a private Storefront
 * token but no Customer Account API secret, or neither.
 */
export type ShopSecrets = {
    readonly token?: string;
    readonly clientSecret?: string;
};

/**
 * A shop row paired with its split-out secrets re-attached out-of-band — the Convex parity of
 * `docToOnlineShop`'s un-masked (`sensitiveData: true`) payload. The secrets ride in a SEPARATE
 * `secrets` bag rather than being grafted back into the discriminated `commerceProvider` union, so the
 * public `Doc<'shops'>` shape (which structurally cannot type a secret) stays intact and a consumer
 * must reach through `.secrets` deliberately. Only the server-trusted {@link sensitiveShopRead}
 * produces this shape.
 */
export type SensitiveShopView = {
    readonly shop: Doc<'shops'>;
    readonly secrets: ShopSecrets;
};

/**
 * A shop write payload as far as the secret-write policy inspects it: the optional commerce-provider
 * authentication subtree carrying the two secret paths. Deliberately structural (not the stored
 * `Doc<'shops'>`, which cannot type a secret) so an editor's attempt to smuggle a secret through an
 * over-shaped patch is still caught.
 */
export type ShopSecretWritePatch = {
    commerceProvider?: {
        authentication?: {
            token?: unknown;
            customers?: { clientSecret?: unknown; [key: string]: unknown };
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

/**
 * Defensively removes the two masked secret paths from a shop payload before it crosses the public
 * wire. CONVEXCORE-04 already shreds them off the stored row, so for a well-formed `Doc<'shops'>` this
 * is a no-op; it exists as belt-and-braces so an over-shaped or legacy-merged row can never leak a
 * secret through a public read. Operates on a structural (JSON) clone — the input is never mutated.
 *
 * @param shop - The shop row (or shop-shaped payload) to mask.
 * @returns A copy of the shop with `commerceProvider.authentication.token` and `customers.clientSecret`
 *   removed.
 */
export function stripShopSecrets(shop: Doc<'shops'>): Doc<'shops'> {
    const clone = JSON.parse(JSON.stringify(shop)) as Doc<'shops'>;
    const authentication = (clone.commerceProvider as { authentication?: Record<string, unknown> }).authentication;
    if (authentication) {
        delete authentication.token;
        const customers = authentication.customers as Record<string, unknown> | undefined;
        if (customers) delete customers.clientSecret;
    }
    return clone;
}

/**
 * Re-attaches a shop's split-out credentials as a {@link SensitiveShopView}. The inverse of the
 * CONVEXCORE-04 shred and of {@link stripShopSecrets}: it pairs the (already secret-free) shop row with
 * the `shopCredentials` values. A `null`/absent credentials row yields an empty `secrets` bag.
 *
 * @param shop - The shop row to pair.
 * @param credentials - The shop's `shopCredentials` row, or `null` when it has none.
 * @returns The shop paired with its (possibly empty) secrets.
 */
export function attachShopSecrets(
    shop: Doc<'shops'>,
    credentials: Pick<Doc<'shopCredentials'>, 'token' | 'clientSecret'> | null,
): SensitiveShopView {
    return {
        shop,
        secrets: { token: credentials?.token, clientSecret: credentials?.clientSecret },
    };
}

/**
 * Enforces the editor-side secret-write policy: an `admin` principal writes the secret paths
 * unchanged, while any non-admin (editor or anonymous) has `commerceProvider.authentication.token` and
 * `customers.clientSecret` STRIPPED from the incoming patch — the Convex parity of the Payload
 * `rejectSecretWritesFromNonAdmins` hook's revert (here a strip, since the public `shops` row never
 * stores a secret; secrets are written out-of-band to `shopCredentials` via the system tier). The
 * "enforce-in-editor" arm of `overrideAccess` for writes; the "bypass-in-sync" arm is the system-tier
 * credential write.
 *
 * @param auth - The resolved CMS principal (or `null` for anonymous).
 * @param patch - The incoming shop write payload.
 * @returns The patch unchanged for an admin; a (cloned) copy with the secret paths removed otherwise.
 */
export function applySecretWritePolicy<T extends ShopSecretWritePatch>(auth: CmsAuthContext, patch: T): T {
    if (isAdmin(auth)) return patch;
    const next = JSON.parse(JSON.stringify(patch)) as T;
    const authentication = next.commerceProvider?.authentication;
    if (authentication) {
        delete authentication.token;
        if (authentication.customers) delete authentication.customers.clientSecret;
    }
    return next;
}

/**
 * The masked public read of the active tenant's shop row. The Convex parity of the Payload
 * `stripSecretsOnRead` hook's editor path and of `docToOnlineShop`'s DEFAULT (masked) projection:
 * built on {@link tenantQuery} so the shop is the server-resolved tenant root (a client `shopId` arg is
 * inert) and the RLS reader denies any cross-tenant row, it deliberately NEVER joins the
 * same-tenant-readable `shopCredentials` table and runs the result through {@link stripShopSecrets}, so
 * a secret can never reach the wire. This is the "enforce-in-editor" arm of `overrideAccess`; the
 * "bypass-in-sync" arm is the server-only {@link sensitiveShopRead}.
 *
 * The storefront provenance (a hostname-resolved `shopId` with no identity) is a later task; today this
 * read serves the admin/identity provenance {@link resolveAdminShopId} expresses.
 *
 * @param ctx - The tenant query context (RLS-wrapped `db`, server-resolved `shopId`).
 * @returns The masked active shop row, or `null` when it cannot be read.
 */
export const readMaskedShop = tenantQuery({
    args: {},
    handler: async (ctx): Promise<Doc<'shops'> | null> => {
        const shop = await ctx.db.get(ctx.shopId);
        return shop ? stripShopSecrets(shop) : null;
    },
});

/**
 * The server-trusted, secret-exposing read — the Convex parity of the storefront's
 * `Shop.findByDomain({ sensitiveData: true })` and of the Payload `req.context.sensitiveShopRead`
 * opt-out. The "bypass-in-sync" arm of `overrideAccess`.
 *
 * Built on {@link systemQuery}, so it is `"internal"` visibility — reachable ONLY from other
 * server-side Convex functions (actions, crons, the storefront's server route), NEVER from the public
 * client surface. The opt-out is therefore STRUCTURAL, not a browser-settable flag: there is no public
 * `{ sensitive: true }` argument a client could pass to unmask. The target shop is derived ENTIRELY
 * from the trusted identity via {@link resolveAdminShopId} (identity → user → `shopCollaborators`),
 * never from a client argument, so a caller can only ever read its OWN shop's secrets — a cross-tenant
 * secret read is impossible.
 *
 * @param ctx - The system query context (raw `db`, validated `auth`).
 * @returns The active shop paired with its split-out credentials.
 * @throws {ConvexError} `SHOP_NOT_FOUND` when the resolved shop row is missing; any auth-resolution
 *   failure from {@link resolveAdminShopId} (`UNAUTHENTICATED`, `FORGED_IDENTITY`,
 *   `IDENTITY_WITHOUT_EMAIL`, `UNKNOWN_USER`, `NO_SHOP_MEMBERSHIP`, `AMBIGUOUS_SHOP_MEMBERSHIP`).
 */
export const sensitiveShopRead = systemQuery({
    args: {},
    handler: async (ctx): Promise<SensitiveShopView> => {
        const shopId = await resolveAdminShopId(ctx);
        const shop = await ctx.db.get(shopId);
        if (!shop) {
            throw new ConvexError({
                code: ShopSecretErrorCode.SHOP_NOT_FOUND,
                message: 'Resolved shop row is missing.',
            });
        }
        const credentials = await ctx.db
            .query('shopCredentials')
            .withIndex('by_shop', (q) => q.eq('shop', shopId))
            .first();
        return attachShopSecrets(shop, credentials);
    },
});
