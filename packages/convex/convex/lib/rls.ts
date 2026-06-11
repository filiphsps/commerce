import type { GenericDatabaseReader, GenericDatabaseWriter, GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { type Rules, wrapDatabaseReader, wrapDatabaseWriter } from 'convex-helpers/server/rowLevelSecurity';

import type { DataModel, Id } from '../_generated/dataModel';
import schema from '../schema';

/**
 * Context type the tenant rules are declared against. The rule predicates here close over the
 * resolved `shopId` and never read the Convex context, so the broadest read context (`GenericQueryCtx`)
 * is sufficient — a mutation context is assignable to it, so the SAME rule set drives both the wrapped
 * reader and the wrapped writer. Typed explicitly (rather than `any`) so the `doc` argument of every
 * predicate stays fully typed against the data model.
 */
type TenantRuleCtx = GenericQueryCtx<DataModel>;

/**
 * Lifts a plain ownership predicate into a convex-helpers {@link Rule}. The rule context is the first
 * positional argument convex-helpers passes, but the tenant predicates are pure functions of the
 * document and the captured `shopId`, so it is discarded via a tuple-rest hole (`(...[, doc])`) rather
 * than a named-but-unused parameter — `noUnusedParameters` forbids the latter and the repo bans
 * underscore suppression. The predicate's `doc` is typed structurally (just the owning key) so the SAME
 * lifted rule satisfies `read`/`modify` (full `Doc`) AND `insert` (`WithoutSystemFields<Doc>`), both of
 * which are subtypes of that minimal shape.
 *
 * @param owns - Predicate deciding whether a document belongs to the scoped tenant.
 * @returns A `Rule`-shaped predicate that ignores its context and returns `owns(doc)`.
 */
function scopedTo<Doc>(owns: (doc: Doc) => boolean): (...args: [ctx: TenantRuleCtx, doc: Doc]) => Promise<boolean> {
    return async (...[, doc]) => owns(doc);
}

/**
 * The unconditional-deny rule the non-tenant tables carry in {@link tenantRules}. Explicit per-table
 * deny (rather than relying on `defaultPolicy: 'deny'` alone) is load-bearing: convex-helpers'
 * wrapped reader/writer infers a BARE id's table by probing `Object.keys(rules)` only — a table
 * absent from the rule map is uninferable, and a bare-id `get`/`patch`/`delete` against it skips
 * both the rule predicate AND the default policy, passing through OPEN. Covering every schema table
 * keeps that inference total, so the bypass path cannot exist.
 */
const denyAll = {
    read: async () => false,
    modify: async () => false,
    insert: async () => false,
};

/**
 * An unconditional-deny rule entry for EVERY table in the schema — the base layer {@link tenantRules}
 * overlays its scoped rules onto. Built from the schema itself so a newly added table is born denied
 * at the tenant tier until it is deliberately given a scoped rule (fail-closed by construction).
 * The cast is sound: `denyAll` ignores its arguments, so it satisfies the rule shape of any table.
 */
const denyEveryTable = Object.fromEntries(Object.keys(schema.tables).map((table) => [table, denyAll])) as Rules<
    TenantRuleCtx,
    DataModel
>;

/**
 * Builds the fail-closed row-level-security (RLS) rule set scoping every tenant-owned table to a single
 * resolved `shopId` (the tenant root — a `shops` row `_id`, NOT the legacy Mongo id). Paired with
 * `defaultPolicy: 'deny'` on {@link wrapTenantDatabaseReader}/{@link wrapTenantDatabaseWriter}, a table
 * with NO rule here is DENIED rather than allowed, so forgetting to scope a new tenant table fails
 * closed instead of leaking cross-tenant rows.
 *
 * EVERY table in the schema carries a rule: the tenant-owned tables get scoped predicates below, and
 * every other table inherits {@link denyEveryTable}'s unconditional deny. Total coverage (not just
 * `defaultPolicy: 'deny'`) is what closes the bare-id bypass — see {@link denyAll}.
 *
 * Coverage and the deliberate non-tenant tiers (all explicit-deny here):
 * - **Tenant root `shops`.** Keyed by its OWN `_id` (the tenant id), so its read/modify predicate is
 *   `doc._id === shopId`. `insert` is denied unconditionally: a brand-new `shops` row has no `_id` yet
 *   to bind to `shopId`, and creating a shop is an onboarding/migration concern that belongs to the
 *   system tier (`systemMutation`), never the per-tenant tier.
 * - **Shop-family side tables** (`shopCredentials`, `shopDomains`, `shopCollaborators`,
 *   `shopFeatureFlags`) and **`reviews`** each carry a `v.id('shops')` foreign key, so their predicates
 *   assert that key equals `shopId`. Read AND write predicates are provided so the wrapped WRITER can
 *   still write a tenant's own rows under `defaultPolicy: 'deny'` (an omitted `modify`/`insert` rule
 *   would otherwise fall through to deny, locking the writer out of every tenant table).
 * - **Explicit deny for the auth tables (`users`/`sessions`/`identities`) and the platform-global
 *   `featureFlags`.** These sit ABOVE any tenant partition (they carry no `shop` key) and are reached
 *   through `systemQuery`/`systemMutation` (lib/system.ts), NEVER through the wrapped tenant db —
 *   which denies them via their {@link denyEveryTable} entry.
 * - **Explicit deny for the CMS content tables** (`pages`, `articles`, …). They are tenant-scoped but
 *   key on a forward-referenced `shop: v.string()` (not a `v.id('shops')` foreign key, mirroring the
 *   revalidation bridge's string tenant id), so they are NOT in this `v.id('shops')`-keyed tenant tier.
 *   Their {@link denyEveryTable} entry denies them at the tenant tier until a string-keyed CMS rule set
 *   (or the `shop` promotion to `v.id('shops')`) lands.
 *
 * The read predicate is per-document defense-in-depth: it pairs with callers range-bounding their
 * queries via `.withIndex('by_shop'|'by_shop_*'|'by_legacy_id', …)`, so a no-match read is both
 * physically range-bounded AND filtered to nothing should a query ever scan beyond its tenant range.
 *
 * @param shopId - The resolved tenant root id (a `shops` row `_id`) every tenant table is scoped to.
 * @returns The RLS {@link Rules} map covering every `v.id('shops')`-keyed tenant table.
 */
export function tenantRules(shopId: Id<'shops'>): Rules<TenantRuleCtx, DataModel> {
    // The tenant root keys on its own `_id`; the side tables on a `shop` foreign key; reviews on `shopId`.
    const ownedByRoot = scopedTo<{ _id: Id<'shops'> }>((doc) => doc._id === shopId);
    const ownedByShop = scopedTo<{ shop: Id<'shops'> }>((doc) => doc.shop === shopId);
    const ownedByShopId = scopedTo<{ shopId: Id<'shops'> }>((doc) => doc.shopId === shopId);

    return {
        ...denyEveryTable,
        shops: {
            read: ownedByRoot,
            modify: ownedByRoot,
            // A brand-new `shops` row has no `_id` yet to bind to `shopId`, and creating a shop is a
            // system-tier onboarding/migration concern — never the per-tenant tier — so deny outright.
            insert: async () => false,
        },
        shopCredentials: {
            read: ownedByShop,
            modify: ownedByShop,
            insert: ownedByShop,
        },
        shopDomains: {
            read: ownedByShop,
            modify: ownedByShop,
            insert: ownedByShop,
        },
        shopCollaborators: {
            read: ownedByShop,
            modify: ownedByShop,
            insert: ownedByShop,
        },
        shopFeatureFlags: {
            read: ownedByShop,
            modify: ownedByShop,
            insert: ownedByShop,
        },
        reviews: {
            read: ownedByShopId,
            modify: ownedByShopId,
            insert: ownedByShopId,
        },
        // The Convex-native drafts/version-history tables (CMSDATA-01). Unlike the descriptor-generated
        // CMS content tables (which key on a forward-referenced `shop: v.string()` and stay rule-less),
        // both carry a real `v.id('shops')` foreign key, so they join this `v.id('shops')`-keyed tenant
        // tier: read+write predicates assert `shopId === shopId` so the wrapped writer can persist a
        // tenant's own drafts/versions under `defaultPolicy: 'deny'` while a cross-tenant read/restore
        // is denied.
        cmsDocuments: {
            read: ownedByShopId,
            modify: ownedByShopId,
            insert: ownedByShopId,
        },
        cmsVersions: {
            read: ownedByShopId,
            modify: ownedByShopId,
            insert: ownedByShopId,
        },
        // The CMSMEDIA-01 original-asset storage ledger. Like `cmsDocuments`/`cmsVersions` it
        // carries a real `v.id('shops')` foreign key, so it joins this tenant tier: the wrapped
        // writer can persist a tenant's own media rows under `defaultPolicy: 'deny'` while a
        // cross-tenant read or write is denied.
        cmsMedia: {
            read: ownedByShopId,
            modify: ownedByShopId,
            insert: ownedByShopId,
        },
        // The CMSMEDIA-02 per-(asset, size) derivative ledger rides the same `v.id('shops')`
        // foreign key as its `cmsMedia` parent, so it joins the tenant tier under the identical
        // scoped predicate.
        cmsMediaDerivatives: {
            read: ownedByShopId,
            modify: ownedByShopId,
            insert: ownedByShopId,
        },
    };
}

/**
 * Builds the fail-closed RLS rule set for the CUSTOMER tier (`authedQuery`/`authedMutation`,
 * lib/authed.ts): an authenticated identity that is NOT a shop collaborator — a storefront
 * customer — may touch exactly ONE row in the whole database: its own platform `users` row,
 * keyed by the trusted identity's email claim.
 *
 * This is deliberately the narrowest possible scope, and the WHY is tenant safety: the customer
 * tier exists so customers can read and provision their own profile WITHOUT inheriting any of the
 * tenant tier's reach. Every tenant-owned table (and every other platform-global table — sessions,
 * identities, featureFlags, the CMS tables) carries {@link denyEveryTable}'s unconditional deny,
 * so a customer-tier function is structurally unable to widen into operator-tier tenant access no
 * matter what its handler does. Total table coverage also closes the bare-id inference bypass,
 * exactly as in {@link tenantRules}.
 *
 * The `users` predicate applies to read, modify, AND insert: a customer can only ever see its own
 * row, only patch its own row, and can only insert a row carrying its own email — which is what
 * makes first-visit provisioning safe to expose on a public, identity-gated mutation.
 *
 * @param email - The trusted identity's email claim (from `requireIdentityEmail`, never a client arg).
 * @returns The RLS {@link Rules} map covering every schema table, allowing only the caller's own `users` row.
 */
export function customerRules(email: string): Rules<TenantRuleCtx, DataModel> {
    const ownRow = scopedTo<{ email: string }>((doc) => doc.email === email);

    return {
        ...denyEveryTable,
        users: {
            read: ownRow,
            modify: ownRow,
            insert: ownRow,
        },
    };
}

/**
 * Wraps a raw database READER in the fail-closed customer RLS for {@link customerRules}, pinning
 * `defaultPolicy: 'deny'`. This is the reader the customer tier (`authedQuery`, lib/authed.ts)
 * substitutes for the raw `ctx.db`.
 *
 * @param ctx - The Convex read context the rule predicates receive (unused by the customer predicate).
 * @param db - The raw database reader to wrap.
 * @param email - The trusted identity's email claim every read is scoped to.
 * @returns A database reader exposing only the caller's own `users` row, denying everything else.
 */
export function wrapCustomerDatabaseReader(
    ctx: GenericQueryCtx<DataModel>,
    db: GenericDatabaseReader<DataModel>,
    email: string,
): GenericDatabaseReader<DataModel> {
    return wrapDatabaseReader(ctx, db, customerRules(email), { defaultPolicy: 'deny' });
}

/**
 * Wraps a raw database WRITER in the fail-closed customer RLS for {@link customerRules}, pinning
 * `defaultPolicy: 'deny'`. Writes re-check the read predicate first (the wrapped writer reads the
 * target row before mutating), so a customer can never patch or delete another user's row. This is
 * the writer the customer tier (`authedMutation`, lib/authed.ts) substitutes for the raw `ctx.db`.
 *
 * @param ctx - The Convex mutation context the rule predicates receive (unused by the customer predicate).
 * @param db - The raw database writer to wrap.
 * @param email - The trusted identity's email claim every read and write is scoped to.
 * @returns A database writer confined to the caller's own `users` row, denying everything else.
 */
export function wrapCustomerDatabaseWriter(
    ctx: GenericMutationCtx<DataModel>,
    db: GenericDatabaseWriter<DataModel>,
    email: string,
): GenericDatabaseWriter<DataModel> {
    return wrapDatabaseWriter(ctx, db, customerRules(email), { defaultPolicy: 'deny' });
}

/**
 * Wraps a raw database READER in the fail-closed tenant RLS for {@link tenantRules}, pinning
 * `defaultPolicy: 'deny'` so any table without a rule (auth tables, global `featureFlags`, CMS content
 * tables, or a future un-scoped table) reads as empty rather than leaking rows. This is the reader the
 * tenant tier (`tenantQuery`, CONVEXCORE-07) substitutes for the raw `ctx.db`.
 *
 * @param ctx - The Convex read context the rule predicates receive (unused by the tenant predicates).
 * @param db - The raw database reader to wrap.
 * @param shopId - The resolved tenant root id every read is scoped to.
 * @returns A database reader that filters every read to the tenant's own rows, denying by default.
 */
export function wrapTenantDatabaseReader(
    ctx: GenericQueryCtx<DataModel>,
    db: GenericDatabaseReader<DataModel>,
    shopId: Id<'shops'>,
): GenericDatabaseReader<DataModel> {
    return wrapDatabaseReader(ctx, db, tenantRules(shopId), { defaultPolicy: 'deny' });
}

/**
 * Wraps a raw database WRITER in the fail-closed tenant RLS for {@link tenantRules}, pinning
 * `defaultPolicy: 'deny'` so a read/modify/insert against any table without a rule is rejected. Every
 * write also re-checks the read predicate first (the wrapped writer reads the target row before
 * modifying it), so a cross-tenant patch/replace/delete is denied as "no read access". This is the
 * writer the tenant tier (`tenantMutation`, CONVEXCORE-07) substitutes for the raw `ctx.db`.
 *
 * @param ctx - The Convex mutation context the rule predicates receive (unused by the tenant predicates).
 * @param db - The raw database writer to wrap.
 * @param shopId - The resolved tenant root id every read and write is scoped to.
 * @returns A database writer that confines every read and write to the tenant's own rows, denying by default.
 */
export function wrapTenantDatabaseWriter(
    ctx: GenericMutationCtx<DataModel>,
    db: GenericDatabaseWriter<DataModel>,
    shopId: Id<'shops'>,
): GenericDatabaseWriter<DataModel> {
    return wrapDatabaseWriter(ctx, db, tenantRules(shopId), { defaultPolicy: 'deny' });
}
