import type { GenericQueryCtx, UserIdentity } from 'convex/server';
import { ConvexError } from 'convex/values';

import type { DataModel, Doc, Id } from '../_generated/dataModel';
import { shopDomainRow } from '../db/shop_routing';
import { getServerEnv } from './env';

/**
 * The slice of a Convex function context this module reads: the `auth` service (to pull the
 * validated {@link UserIdentity}) and the `db` reader (to map that identity onto the
 * platform-global `users`/`shopCollaborators` rows). Typed as a `Pick` of the read context so
 * BOTH a query and a mutation ctx satisfy it — a mutation's writer `db` is assignable to the
 * reader `db` — and so callers cannot pass a wider surface than these helpers actually touch.
 */
type AuthReadCtx = Pick<GenericQueryCtx<DataModel>, 'auth' | 'db'>;

/**
 * Stable string codes carried on every {@link ConvexError} this module throws, so call sites
 * (and `convex-test`) can branch on the failure cause without string-matching messages. These
 * mirror the spirit of `@nordcom/commerce-errors` kinds, but Convex functions run in the Convex
 * isolate (not Node) and `@nordcom/commerce-errors` is not on the Convex bundle's dependency
 * surface, so a local `ConvexError` payload is the sanctioned in-runtime error contract here.
 */
export const AuthErrorCode = {
    /** No identity on the request — `getUserIdentity()` returned `null` (unauthenticated). */
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    /**
     * The identity's `iss` does not match the trusted issuer for its tier (forged / wrong provider):
     * the Clerk issuer (`CLERK_FRONTEND_API_URL`) for ADMIN operators, or `CONVEX_AUTH_ISSUER` for
     * storefront customers. Each tier re-asserts only its OWN issuer, so a token minted for the other
     * tier is rejected here as well as cross-tier-forged.
     */
    FORGED_IDENTITY: 'FORGED_IDENTITY',
    /** The validated identity carries no `email` claim, so it cannot be mapped to a `users` row. */
    IDENTITY_WITHOUT_EMAIL: 'IDENTITY_WITHOUT_EMAIL',
    /** The identity validated but maps to no platform `users` row. */
    UNKNOWN_USER: 'UNKNOWN_USER',
    /** The user collaborates on no shop, so no tenant `shopId` can be resolved. */
    NO_SHOP_MEMBERSHIP: 'NO_SHOP_MEMBERSHIP',
    /** The user collaborates on more than one shop; the active-tenant selection is CONVEXCORE-16's job. */
    AMBIGUOUS_SHOP_MEMBERSHIP: 'AMBIGUOUS_SHOP_MEMBERSHIP',
    /** No `shopDomains` row claims the requested routing `domain` — the domain maps to no shop at all. */
    UNKNOWN_SHOP: 'UNKNOWN_SHOP',
    /**
     * A `shopDomains` routing row claims the `domain`, but its `shop` foreign key resolves to no row — a
     * dangling reference (shop deleted out from under a stale routing row). Distinct from `UNKNOWN_SHOP`
     * (no routing row at all) so the dangling-FK data fault is observable rather than masked as "unknown".
     */
    SHOP_ORPHANED: 'SHOP_ORPHANED',
    /**
     * The resolved shop carries no `clerkOrgId` — an un-backfilled row from before the Clerk migration.
     * Access cannot be decided because there is no owning org to check membership against; the backfill
     * migration must stamp the org before the shop is reachable through the operator authorization gate.
     */
    SHOP_WITHOUT_ORG: 'SHOP_WITHOUT_ORG',
    /**
     * The operator is not a member of the shop's OWNING org: no `orgMemberships` row joins the operator
     * to `shop.clerkOrgId` (the {@link resolveShopAccess} authorization gate). The org-tenancy analogue
     * of `NO_SHOP_MEMBERSHIP`, kept distinct so a missing org membership is not conflated with the
     * legacy `resolveAdminShopId` "collaborates on no shop" failure.
     */
    NO_ORG_MEMBERSHIP: 'NO_ORG_MEMBERSHIP',
} as const;

/**
 * The trusted NextAuth issuer the identity's `iss` must match, read from the Convex deployment
 * env. Kept in lockstep with `auth.config.ts`'s `CONVEX_AUTH_ISSUER`: that config is the PRIMARY
 * gate (Convex verifies the JWT signature and `iss`/`aud` before `getUserIdentity()` ever
 * returns), and this is the defense-in-depth re-assertion that also makes forgery rejection
 * testable under `convex-test`, whose `withIdentity` fakes an identity WITHOUT running Convex's
 * signature/issuer validation.
 *
 * @returns The configured issuer, or `undefined` when the env var is unset.
 */
function getTrustedIssuer(): string | undefined {
    return getServerEnv('CONVEX_AUTH_ISSUER');
}

/**
 * The trusted Clerk issuer an ADMIN operator identity's `iss` must match, read from the Convex
 * deployment env. Kept in lockstep with `auth.config.ts`'s Clerk provider, whose `domain` is this
 * same `CLERK_FRONTEND_API_URL`: that config is the PRIMARY gate (Convex verifies the Clerk JWT's
 * signature and `iss`/`aud` before `getUserIdentity()` ever returns), and this is the
 * defense-in-depth re-assertion that also makes forgery rejection testable under `convex-test`,
 * whose `withIdentity` fakes an identity WITHOUT running Convex's signature/issuer validation.
 *
 * This is the OPERATOR-tier counterpart to {@link getTrustedIssuer}: operator tokens come from
 * Clerk (a different issuer than the customer `CONVEX_AUTH_ISSUER`), so the operator path validates
 * against this issuer and must NOT reuse the customer gate.
 *
 * @returns The configured Clerk issuer, or `undefined` when the env var is unset.
 */
function getClerkIssuer(): string | undefined {
    return getServerEnv('CLERK_FRONTEND_API_URL');
}

/**
 * Validates the request's Convex auth identity as an ADMIN operator (Clerk) identity and returns it.
 *
 * The operator-tier analog of {@link getTrustedIdentity}: it reads the identity Convex already
 * verified (signature + `iss`/`aud` per the Clerk provider in `auth.config.ts`) and re-asserts the
 * issuer against {@link getClerkIssuer} as a second, in-handler line of defense. When the Clerk
 * issuer is configured, an identity whose `issuer` differs is rejected as forged; when it is not
 * configured, the platform-level validation is relied on alone (documented fallback, since the
 * deployment always sets it). A CUSTOMER token (minted on the `CONVEX_AUTH_ISSUER` customJwt
 * provider) carries a different issuer and is therefore rejected here — operator code must never
 * reuse {@link getTrustedIdentity}, whose customer gate would conversely reject this Clerk identity.
 *
 * @param ctx - A Convex query or mutation context exposing `auth`.
 * @returns The validated Clerk operator {@link UserIdentity}.
 * @throws {ConvexError} `UNAUTHENTICATED` when there is no identity on the request.
 * @throws {ConvexError} `FORGED_IDENTITY` when the identity's issuer is not the trusted Clerk issuer.
 */
export async function getClerkOperatorIdentity(ctx: AuthReadCtx): Promise<UserIdentity> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError({
            code: AuthErrorCode.UNAUTHENTICATED,
            message: 'No authenticated identity on the request.',
        });
    }

    const clerkIssuer = getClerkIssuer();
    if (clerkIssuer && identity.issuer !== clerkIssuer) {
        throw new ConvexError({
            code: AuthErrorCode.FORGED_IDENTITY,
            message: 'Identity issuer does not match the trusted Clerk operator issuer.',
        });
    }

    return identity;
}

/**
 * Validates the request's Convex auth identity and returns it.
 *
 * Reads the identity Convex already verified (signature + `iss`/`aud` per `auth.config.ts`) and
 * re-asserts the issuer against {@link getTrustedIssuer} as a second, in-handler line of defense.
 * When the trusted issuer is configured, an identity whose `issuer` differs is rejected as forged;
 * when it is not configured, the platform-level validation is relied on alone (documented fallback,
 * since the deployment always sets it).
 *
 * @param ctx - A Convex query or mutation context exposing `auth`.
 * @returns The validated {@link UserIdentity}.
 * @throws {ConvexError} `UNAUTHENTICATED` when there is no identity on the request.
 * @throws {ConvexError} `FORGED_IDENTITY` when the identity's issuer is not the trusted NextAuth issuer.
 */
export async function getTrustedIdentity(ctx: AuthReadCtx): Promise<UserIdentity> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError({
            code: AuthErrorCode.UNAUTHENTICATED,
            message: 'No authenticated identity on the request.',
        });
    }

    const trustedIssuer = getTrustedIssuer();
    if (trustedIssuer && identity.issuer !== trustedIssuer) {
        throw new ConvexError({
            code: AuthErrorCode.FORGED_IDENTITY,
            message: 'Identity issuer does not match the trusted NextAuth issuer.',
        });
    }

    return identity;
}

/**
 * Extracts the email claim a trusted identity must carry to be mapped onto the platform `users`
 * table. Factored out of {@link resolveUserFromIdentity} because the customer tier
 * (`authedQuery`/`authedMutation`, lib/authed.ts) needs the email BEFORE a `users` row exists —
 * provisioning keys the new row on exactly this claim, so the requirement has to be assertable
 * without also requiring the row.
 *
 * @param identity - A validated {@link UserIdentity} (already issuer-asserted).
 * @returns The trimmed email claim.
 * @throws {ConvexError} `IDENTITY_WITHOUT_EMAIL` when the identity carries no email claim.
 */
export function requireIdentityEmail(identity: UserIdentity): string {
    const email = identity.email?.trim();
    if (!email) {
        throw new ConvexError({
            code: AuthErrorCode.IDENTITY_WITHOUT_EMAIL,
            message: 'Trusted identity carries no email claim to map to a user.',
        });
    }
    return email;
}

/**
 * Resolves the platform `users` row backing the request's trusted ADMIN OPERATOR (Clerk) identity.
 *
 * The OPERATOR-tier user resolver. Validates the identity as a Clerk operator
 * ({@link getClerkOperatorIdentity}) and maps it onto a `users` row in two ordered steps:
 * 1. **Clerk subject** — `users.by_clerk_user_id` on `identity.subject` (the `user_…` id). This is
 *    the durable, email-change-proof link populated by the Clerk webhook + `ensureCurrentUser`
 *    backfill in later tasks; it is preferred so an operator who changes their email still resolves.
 * 2. **Email fallback** — `users.by_email` using {@link requireIdentityEmail}, for rows that predate
 *    the migration (or before the backfill has stamped `clerkUserId` onto them).
 *
 * This resolver is deliberately READ-ONLY: it does NOT lazily backfill `clerkUserId` on an
 * email-fallback hit, so it stays safe to call from a query context. The backfill is owned by the
 * Clerk webhook and the `ensureCurrentUser` mutation (later tasks), not this read path.
 *
 * Both lookups go through the RAW `ctx.db`: `users` is a platform-global, system-tier-exempt table
 * that sits above any tenant partition, so reading it here is sanctioned un-scoped access, not a
 * tenant-isolation hole. This is operator-only — every caller resolves a `shopCollaborators`
 * membership downstream; the customer tier (`authedQuery`/`authedMutation`) never reaches it and
 * keeps validating on the `CONVEX_AUTH_ISSUER` customJwt path via {@link getTrustedIdentity}.
 *
 * @param ctx - A Convex query or mutation context exposing `auth` and `db`.
 * @returns The `users` document the Clerk identity maps to.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` from {@link getClerkOperatorIdentity}.
 * @throws {ConvexError} `IDENTITY_WITHOUT_EMAIL` when the subject misses and the identity carries no email claim.
 * @throws {ConvexError} `UNKNOWN_USER` when no `users` row matches the identity's Clerk subject or email.
 */
export async function resolveUserFromIdentity(ctx: AuthReadCtx): Promise<Doc<'users'>> {
    const identity = await getClerkOperatorIdentity(ctx);

    const bySubject = await ctx.db
        .query('users')
        .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', identity.subject))
        .first();
    if (bySubject) {
        return bySubject;
    }

    const email = requireIdentityEmail(identity);
    const byEmail = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .first();
    if (!byEmail) {
        throw new ConvexError({
            code: AuthErrorCode.UNKNOWN_USER,
            message: 'No platform user matches the trusted Clerk operator identity.',
        });
    }

    return byEmail;
}

/**
 * Resolves the single server-trusted `shopId` an admin operator's identity is scoped to.
 *
 * Derives the tenant ENTIRELY from the validated identity → user → `shopCollaborators` (`by_user`)
 * chain, never from a client argument, so it cannot be spoofed: the caller has no say in which shop
 * is returned. This is the trusted `shopId` provenance the tenant tier (`tenantQuery`/`tenantMutation`,
 * CONVEXCORE-07) pins into `ctx.shopId`.
 *
 * For this identity-plumbing task the user is expected to collaborate on exactly one shop; a user
 * with multiple collaborations is rejected as ambiguous because choosing the ACTIVE tenant among many
 * (the payload-tenant-cookie analog) is the admin shop resolver's job in CONVEXCORE-16, which layers
 * the active-tenant selection on top of this membership check.
 *
 * @param ctx - A Convex query or mutation context exposing `auth` and `db`.
 * @returns The `shops` document id the operator is scoped to.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` / `UNKNOWN_USER` from the identity → user resolution.
 * @throws {ConvexError} `NO_SHOP_MEMBERSHIP` when the user collaborates on no shop.
 * @throws {ConvexError} `AMBIGUOUS_SHOP_MEMBERSHIP` when the user collaborates on more than one shop.
 */
export async function resolveAdminShopId(ctx: AuthReadCtx): Promise<Id<'shops'>> {
    const user = await resolveUserFromIdentity(ctx);

    const collaborators = await ctx.db
        .query('shopCollaborators')
        .withIndex('by_user', (q) => q.eq('user', user._id))
        .collect();

    if (collaborators.length === 0) {
        throw new ConvexError({
            code: AuthErrorCode.NO_SHOP_MEMBERSHIP,
            message: 'Trusted identity is not a collaborator on any shop.',
        });
    }
    if (collaborators.length > 1) {
        throw new ConvexError({
            code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP,
            message: 'Trusted identity collaborates on multiple shops; active-tenant selection is required.',
        });
    }

    const [collaborator] = collaborators;
    if (!collaborator) {
        // Unreachable given the length checks above, but narrows away the `T | undefined` that
        // `noUncheckedIndexedAccess` puts on the tuple destructure without resorting to `!`.
        throw new ConvexError({
            code: AuthErrorCode.NO_SHOP_MEMBERSHIP,
            message: 'Trusted identity is not a collaborator on any shop.',
        });
    }

    return collaborator.shop;
}

/**
 * Authorizes an admin operator for the shop addressed by a routing `domain`, returning that shop's id.
 *
 * The Clerk-org tenancy gate (spec Task 2.3): a Clerk org owns N shops and a user belongs to N orgs, so
 * access to a shop = the operator is a member of the shop's OWNING org. This resolver decides that with
 * the standard `subject` claim plus the synced `orgMemberships` mirror ONLY — it never reads the Clerk
 * `org_id` JWT claim (whose surfacing through Convex is uncertain; the active-org concern is the app
 * layer's, Task 5.1). The steps:
 * 1. Resolve the operator from the validated Clerk identity ({@link resolveUserFromIdentity}).
 * 2. Resolve the shop from `domain` through the shared `shopDomains.by_domain` routing read in
 *    `db/shops` ({@link shopDomainRow}) — the SAME indexed lookup the storefront's {@link shopByDomain}
 *    builds on, so the domain→shop logic lives in one place. A missing routing row is `UNKNOWN_SHOP`;
 *    a routing row whose `shop` FK dangles is `SHOP_ORPHANED`, kept distinct rather than masked.
 * 3. Require the shop to carry a `clerkOrgId` (its owning org); an un-backfilled row is unreachable.
 * 4. Require an `orgMemberships` row joining `(shop.clerkOrgId, operator._id)` via `by_clerk_org_user`.
 *
 * Read-only: it performs no writes and is safe to call from a query context. This is ADDITIVE — it does
 * NOT replace {@link resolveAdminShopId}; the app-wiring repoint of callers is Task 5.1.
 *
 * @param ctx - A Convex query or mutation context exposing `auth` and `db`.
 * @param domain - The routing hostname (no scheme, no port) addressing the target shop.
 * @returns The `shops` document id the operator is authorized for.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` / `UNKNOWN_USER` from the identity → user resolution.
 * @throws {ConvexError} `UNKNOWN_SHOP` when no `shopDomains` row claims the domain.
 * @throws {ConvexError} `SHOP_ORPHANED` when a routing row claims the domain but its `shop` FK dangles.
 * @throws {ConvexError} `SHOP_WITHOUT_ORG` when the resolved shop has no `clerkOrgId` (un-backfilled).
 * @throws {ConvexError} `NO_ORG_MEMBERSHIP` when the operator is not a member of the shop's owning org.
 */
export async function resolveShopAccess(ctx: AuthReadCtx, domain: string): Promise<Id<'shops'>> {
    const operator = await resolveUserFromIdentity(ctx);

    const domainRow = await shopDomainRow(ctx, domain);
    if (!domainRow) {
        throw new ConvexError({
            code: AuthErrorCode.UNKNOWN_SHOP,
            message: 'No shop claims the requested domain.',
        });
    }
    const shop = await ctx.db.get(domainRow.shop);
    if (!shop) {
        throw new ConvexError({
            code: AuthErrorCode.SHOP_ORPHANED,
            message: 'A routing row claims the domain but its shop no longer exists.',
        });
    }

    const { clerkOrgId } = shop;
    if (!clerkOrgId) {
        throw new ConvexError({
            code: AuthErrorCode.SHOP_WITHOUT_ORG,
            message: 'Shop has no owning Clerk org; access cannot be authorized until it is backfilled.',
        });
    }

    const membership = await ctx.db
        .query('orgMemberships')
        .withIndex('by_clerk_org_user', (q) => q.eq('clerkOrgId', clerkOrgId).eq('user', operator._id))
        .first();
    if (!membership) {
        throw new ConvexError({
            code: AuthErrorCode.NO_ORG_MEMBERSHIP,
            message: 'Operator is not a member of the shop\'s owning org.',
        });
    }

    return shop._id;
}
