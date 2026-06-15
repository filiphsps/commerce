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
 * OAuth provider-link attributes shared by the standalone {@link identityValidator} row and the
 * copy embedded on each user (`UserBase.identities`). Mirrors `IdentityBase`'s own fields from
 * `@nordcom/commerce-db`'s `identity.ts`: a `provider` name, the provider-scoped `identity` id,
 * and the optional OAuth token fields. Mongo `Date` token expiry becomes numeric epoch-ms here.
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
 * by `getUserByAccount`), which is why the standalone {@link identitiesTable} needs no `by_user` index.
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
 * Stored row shape for the canonical, standalone OAuth identity, mirroring `IdentityBase`'s own
 * fields. The Auth.js adapter upserts this row keyed on `(provider, identity)` before copying it
 * into the owning user's embedded list. No `user` foreign key: the user link is the embedded array
 * on `users`, faithful to the Mongo `IdentitySchema`, which likewise carries no user reference.
 */
export const identityValidator = v.object({
    ...identityAttributes,
    ...timestampFields,
});

/**
 * Inferred row shape for a standalone identity. See {@link identityValidator}.
 */
export type IdentityBase = Infer<typeof identityValidator>;

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
 * identities, and optional per-user {@link userPreferencesValidator}. `email` uniqueness is enforced
 * in the mutation layer, not by the index.
 */
export const userValidator = v.object({
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    emailVerified: v.union(v.number(), v.null()),
    groups: v.optional(v.array(v.string())),
    identities: v.array(embeddedIdentityValidator),
    preferences: v.optional(userPreferencesValidator),
    ...timestampFields,
});

/**
 * Inferred row shape for a platform user, mirroring `UserBase`. See {@link userValidator}.
 */
export type UserBase = Infer<typeof userValidator>;

/**
 * Stored row shape for an authenticated session, mirroring `SessionBase` from
 * `@nordcom/commerce-db`'s `session.ts`: a bearer `token`, an `expiresAt` expiry (Mongo `Date` →
 * numeric epoch-ms here), and the owning `user`. `user` is a real `v.id('users')` reference because
 * the `users` table is registered in this same table group, so codegen resolves it.
 */
export const sessionValidator = v.object({
    user: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
    ...timestampFields,
});

/**
 * Inferred row shape for a session, mirroring `SessionBase`. See {@link sessionValidator}.
 */
export type SessionBase = Infer<typeof sessionValidator>;

/**
 * Platform user table. `by_email` backs the adapter's `getUserByEmail` lookup; the source `email`
 * uniqueness has no equivalent unique index in Convex and is enforced in the mutation layer.
 */
const usersTable = defineTable(userValidator).index('by_email', ['email']);

/**
 * Session table. `by_token` backs token validation, `by_user` lists a user's sessions, and
 * `by_expiry` backs reaping expired sessions.
 */
const sessionsTable = defineTable(sessionValidator)
    .index('by_token', ['token'])
    .index('by_user', ['user'])
    .index('by_expiry', ['expiresAt']);

/**
 * Canonical OAuth identity table. `by_provider_identity` backs the `(provider, identity)` upsert
 * lookup. Convex indexes are NOT unique, so the `(provider, identity)` uniqueness the Mongo
 * `IdentitySchema` enforced via a unique index is instead enforced in the mutation layer (read
 * through `by_provider_identity` before insert) — this index is a lookup accelerator, not a constraint.
 */
const identitiesTable = defineTable(identityValidator).index('by_provider_identity', ['provider', 'identity']);

/**
 * Platform-global auth tables (`users`, `sessions`, `identities`). These are NOT tenant-scoped: a
 * user, its sessions, and its OAuth identities exist above any single shop, so they carry no `shop`
 * foreign key and sit OUTSIDE the multi-tenant `by_shop_<field>` index convention. Wired into
 * `coreTables` (the platform-global group), never into a tenant grouping. Spread into `defineSchema`
 * via `tables/index.ts`.
 */
export const authTables = {
    users: usersTable,
    sessions: sessionsTable,
    identities: identitiesTable,
};
