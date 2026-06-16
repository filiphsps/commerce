import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Stored row shape for a Clerk Organization mirror. Clerk is the source of truth; this table is
 * populated and kept current by the webhook handler (a later task). `clerkOrgId` is the Clerk
 * `org_…` subject string. `imageUrl` is optional because Clerk serves it from a CDN and the field
 * may be absent on programmatically-created orgs. `createdAt`/`updatedAt` are the Clerk-side
 * timestamps (epoch-ms), preserved explicitly rather than relying on `_creationTime` — the same
 * managed-timestamp contract used by the auth and shop tables.
 */
export const orgValidator = v.object({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
});

/**
 * Inferred row shape for a Clerk Organization mirror. See {@link orgValidator}.
 */
export type OrgBase = Infer<typeof orgValidator>;

/**
 * Stored row shape for a Clerk org-membership mirror. Links a `users` row to a Clerk Organization
 * by both the Convex user id (`user`) and the raw Clerk user subject (`clerkUserId`) — the latter
 * lets the webhook handler upsert memberships before the users webhook has been processed. `role`
 * is the Clerk-assigned role string (`"org:admin"`, `"org:member"`, etc.). `createdAt` is the
 * Clerk-side timestamp (epoch-ms). No `updatedAt`: Clerk emits a delete+insert on role change, so
 * the row is never mutated in place.
 */
export const orgMembershipValidator = v.object({
    clerkOrgId: v.string(),
    user: v.id('users'),
    clerkUserId: v.string(),
    role: v.string(),
    createdAt: v.number(),
});

/**
 * Inferred row shape for a Clerk org-membership mirror. See {@link orgMembershipValidator}.
 */
export type OrgMembership = Infer<typeof orgMembershipValidator>;

/**
 * Clerk Organization mirror table. `by_clerk_org` backs the webhook upsert keyed on `clerkOrgId`
 * and org lookups in the membership resolution chain.
 */
const orgsTable = defineTable(orgValidator).index('by_clerk_org', ['clerkOrgId']);

/**
 * Clerk org-membership mirror table. `by_clerk_org` lists all members of an org (e.g. for bulk
 * revocation); `by_user` lists all orgs a user belongs to (the storefront shop-picker path);
 * `by_clerk_org_user` backs the `(org, user)` membership check and the mutation-layer uniqueness
 * of that pair — mirrors the `shopCollaborators.by_shop_user` compound pattern.
 */
const orgMembershipsTable = defineTable(orgMembershipValidator)
    .index('by_clerk_org', ['clerkOrgId'])
    .index('by_user', ['user'])
    .index('by_clerk_org_user', ['clerkOrgId', 'user']);

/**
 * Clerk mirror table group: read-only `orgs` and `orgMemberships` synced from Clerk webhooks.
 * Platform-global (no `v.id('shops')` foreign key) — a user may belong to multiple orgs, and an
 * org owns multiple shops, so these tables sit above the tenant tier. Spread into `coreTables` in
 * `tables/index.ts`, never into a tenant grouping.
 */
export const orgTables = {
    orgs: orgsTable,
    orgMemberships: orgMembershipsTable,
};
