import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';

import { DEFAULT_SHOP_LEGACY_ID } from './fixtures/shop';

/**
 * The deployed server-tier seam this helper drives: `db/clerk_seed:seedClerkOperator`, which
 * provisions the e2e Clerk operator's identity model (`users.clerkUserId` + `orgs` + `orgMemberships`
 * + `shops.clerkOrgId` + projected `shopCollaborators`) in one transaction — the rows the Clerk
 * webhook would have synced, which a local backend has no webhook to deliver.
 */
const seedClerkOperatorRef = makeFunctionReference<'mutation'>('db/clerk_seed:seedClerkOperator');

/**
 * The narrow seam result the harness consumes (the wire erases the branded Convex ids).
 */
export type SeedClerkOperatorView = {
    userId: string;
    clerkOrgId: string;
    shopId: string;
};

/**
 * Inputs for {@link seedClerkOperatorLive}. Mirrors the Clerk ids the e2e harness obtains from the
 * Clerk Backend API (`clerkUserId`/`clerkOrgId`) plus the operator/org display fields. `shopLegacyId`
 * defaults to the canonical demo shop the rest of the seed creates, so the org owns the shop the e2e
 * routes through.
 */
export interface SeedClerkOperatorOptions {
    /** The Clerk user subject (`user_…`) to map onto the operator's `users` row. */
    clerkUserId: string;
    /** The operator's email — the `by_email` link key, matched to the Clerk test user's primary email. */
    email: string;
    /** The operator's display name. */
    name: string;
    /** The Clerk organization id (`org_…`) that will own the canonical shop. */
    clerkOrgId: string;
    /** The org's display name (mirrored into the `orgs` table for the chooser). */
    orgName: string;
    /** The org's slug. */
    orgSlug: string;
    /** The Clerk-assigned role string; defaults to `org:admin` (the test user is the org creator). */
    role?: string;
    /** The public `legacyId` of the shop to attach the org to; defaults to the canonical demo shop. */
    shopLegacyId?: string;
}

/**
 * Provisions the e2e Clerk operator's identity model onto a RUNNING deployment by calling the deployed
 * `db/clerk_seed:seedClerkOperator` server-tier mutation — the Clerk-org analog of {@link seedCanonical}
 * for the auth graph. Must run AFTER the canonical shop seed (the org attaches to the shop resolved by
 * `shopLegacyId`).
 *
 * Idempotent end-to-end: the underlying mutation upserts the user/org/membership and re-projects the
 * collaborator rows, so a re-run patches in place and never duplicates — safe to call on every e2e
 * boot against the shared deployment.
 *
 * @param url - Deployment URL to seed.
 * @param opts - The Clerk ids + operator/org display fields (see {@link SeedClerkOperatorOptions}).
 * @returns The seeded operator's `users` id, the org id, and the shop id, as plain strings.
 * @throws {ConvexError} When `CONVEX_SERVER_SECRET` is unset, or the mutation rejects (e.g. the shop is
 *   missing — run the canonical seed first).
 */
export async function seedClerkOperatorLive(
    url: string,
    opts: SeedClerkOperatorOptions,
): Promise<SeedClerkOperatorView> {
    const serverSecret = process.env.CONVEX_SERVER_SECRET;
    if (!serverSecret) {
        throw new ConvexError(
            '@nordcom/commerce-test-convex: CONVEX_SERVER_SECRET must be set to the value configured on the target deployment before seeding the e2e Clerk operator.',
        );
    }

    const client = new ConvexHttpClient(url);
    return (await client.mutation(seedClerkOperatorRef, {
        serverSecret,
        clerkUserId: opts.clerkUserId,
        email: opts.email,
        name: opts.name,
        clerkOrgId: opts.clerkOrgId,
        orgName: opts.orgName,
        orgSlug: opts.orgSlug,
        role: opts.role,
        shopLegacyId: opts.shopLegacyId ?? DEFAULT_SHOP_LEGACY_ID,
    })) as SeedClerkOperatorView;
}
