import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Mongo `timestamps: true` carries `createdAt`/`updatedAt` on every db document (see
 * `@nordcom/commerce-db`'s `BaseTimestamps`). Convex's own `_creationTime` reflects the INSERT
 * moment — which, for migrated rows, is the migration run, not the original creation — so the
 * source timestamps are preserved as explicit numeric (epoch-ms) fields rather than relying on
 * `_creationTime`. Shared so every auth table mirrors the same managed-timestamp contract.
 */
const timestampFields = {
    createdAt: v.number(),
    updatedAt: v.number(),
};

/**
 * OAuth provider-link attributes embedded on each user (`UserBase.identities`). Mirrors `IdentityBase`'s
 * own fields from `@nordcom/commerce-db`'s `identity.ts`: a `provider` name, the provider-scoped
 * `identity` id, and the optional OAuth token fields. Mongo `Date` token expiry becomes numeric epoch-ms
 * here.
 */
const identityAttributes = {
    provider: v.string(),
    identity: v.string(),
    scope: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    refreshToken: v.optional(v.string()),
    accessToken: v.optional(v.string()),
};

/**
 * The copy of an OAuth identity embedded in `users.identities`, mirroring `UserBase.identities`
 * (`IdentityBase[]`). Carries its own string `id` because the Auth.js adapter dedupes the embedded
 * list by `identity.id` (`auth.adapter.ts` `linkAccount`); on migration this is the Mongo subdocument
 * id. The user→identities relationship lives as this embedded array (the `$elemMatch` query path used
 * by `getUserByAccount`).
 */
export const embeddedIdentityValidator = v.object({
    id: v.string(),
    ...identityAttributes,
    ...timestampFields,
});

/**
 * Inferred shape of an identity embedded on a user, mirroring `IdentityBase` from
 * `@nordcom/commerce-db`. See {@link embeddedIdentityValidator}.
 */
export type EmbeddedIdentity = Infer<typeof embeddedIdentityValidator>;

/**
 * Per-user UI preferences embedded on the platform user. Optional end-to-end so existing rows (which
 * predate this field) validate unchanged. `theme` is the operator's admin theme choice: `'system'`
 * follows the OS, `'dark'` pins dark. There is no `'light'` value yet because the admin has no light
 * token set; the choice is persisted and applied (light-ready) but visually inert until a
 * `[data-theme="light"]` block lands.
 */
export const userPreferencesValidator = v.object({
    theme: v.optional(v.union(v.literal('dark'), v.literal('system'))),
});

/**
 * Inferred per-user preferences shape. See {@link userPreferencesValidator}.
 */
export type UserPreferences = Infer<typeof userPreferencesValidator>;

/**
 * Stored row shape for a platform user, mirroring `UserBase` from `@nordcom/commerce-db`'s
 * `user.ts` and the Auth.js adapter contract: a unique `email`, a `name`, optional `avatar`, the
 * nullable `emailVerified` timestamp (Mongo `Date` → numeric epoch-ms here), an optional `groups`
 * allowlist, the embedded {@link embeddedIdentityValidator} list that links the user to its OAuth
 * identities, optional per-user {@link userPreferencesValidator}, and the optional `clerkUserId`
 * subject string populated during the Clerk auth migration so Clerk identities resolve to this row.
 * `email` uniqueness is enforced in the mutation layer, not by the index.
 */
export const userValidator = v.object({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    emailVerified: v.union(v.number(), v.null()),
    groups: v.optional(v.array(v.string())),
    identities: v.array(embeddedIdentityValidator),
    preferences: v.optional(userPreferencesValidator),
    /** Clerk user subject (`user_…`) that maps this row to a Clerk identity; absent on rows predating the migration. */
    clerkUserId: v.optional(v.string()),
    ...timestampFields,
});

/**
 * Inferred row shape for a platform user, mirroring `UserBase`. See {@link userValidator}.
 */
export type UserBase = Infer<typeof userValidator>;

/**
 * Platform user table. `by_email` backs the adapter's `getUserByEmail` lookup; `by_clerk_user_id`
 * backs Clerk identity resolution during and after the auth migration. `email` uniqueness has no
 * equivalent unique index in Convex and is enforced in the mutation layer.
 */
const usersTable = defineTable(userValidator)
    .index('by_email', ['email'])
    .index('by_clerk_user_id', ['clerkUserId']);

/**
 * Platform-global auth tables (just `users`). NOT tenant-scoped: a user exists above any single shop,
 * so it carries no `shop` foreign key and sits OUTSIDE the multi-tenant `by_shop_<field>` index
 * convention. Wired into `coreTables` (the platform-global group), never into a tenant grouping.
 * Spread into `defineSchema` via `tables/index.ts`.
 *
 * The NextAuth-era standalone `sessions` and `identities` tables were dropped after the Clerk auth
 * migration: operators authenticate through Clerk and the storefront customer path runs a JWT-strategy
 * NextAuth config with no database adapter, so neither table had a live reader or writer. The OAuth
 * provider links a user owns survive as the embedded `users.identities` array ({@link embeddedIdentityValidator}).
 */
export const authTables = {
    users: usersTable,
};
