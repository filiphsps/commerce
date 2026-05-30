# Phase 0 — `tenantsSlug` Repoint Feasibility Spike (UNIFY-01, GATE)

**Status:** GO
**Date:** 2026-05-30
**Branch:** `feat/convex-migration`
**Type:** Throwaway code-analysis spike. The only committed artifact is this document — no production code change lands here.

## Purpose

The Mongo→Convex migration (Phase 0) collapses **three** shop representations into one and moves the
`@payloadcms/plugin-multi-tenant` `tenantsSlug` from the dedicated `tenants` collection onto the unified
`shops` collection, with **tenant key = the shop row's `_id`**. This spike proves that repoint is feasible
and records a go/no-go before UNIFY-03/04/05/06/11 commit to it.

The three representations today:

1. **Mongoose `Shop`** — `db.model('Shop', ShopSchema)` → Mongo collection `shops` (`packages/db/src/models/shop.ts:666`).
2. **Payload `shops`** — `slug: 'shops'`, no `dbName` → Mongo collection `shops` (`packages/cms/src/collections/shops.ts:21`).
3. **Payload `tenants`** — `slug: 'tenants'`, carries a `shopId` back-reference to `Shop._id` (`packages/cms/src/collections/tenants.ts:12,26`). This is the row whose `_id` the multi-tenant plugin writes into every tenant-scoped doc's `tenant` field.

The collapse deletes representation #3 and points the plugin at representation #2 (== #1).

---

## Q1 — Can `plugin-multi-tenant` repoint `tenantsSlug` from `tenants` → `shops`, with tenant key = shop row id?

**Answer: YES. The config change is a one-liner; no plugin-level blocker.**

### Current configuration

`packages/cms/src/plugins/multi-tenant.ts:21-25`:

```ts
return multiTenantPlugin({
    tenantsSlug: 'tenants',
    userHasAccessToAllTenants: (user) => (user as { role?: string } | null)?.role === 'admin',
    collections: collectionsConfig,
});
```

### What the repoint entails

- `tenantsSlug` is documented as *"the slug used for the tenant collection, which defaults to `'tenants'`"* (Payload `plugin-multi-tenant` README, via Context7 `/payloadcms/payload`). It is purely a slug reference — the plugin does **not** own the tenant collection's fields: the docs explicitly say *"remember, you own these fields"* and *"Users must add a Tenants collection to control what fields are available for each tenant."* Any existing collection can serve as the tenant collection.
- The plugin injects a `tenant` **relationship** field on every tenant-enabled collection, with `relationTo: <tenantsSlug>`. Changing `tenantsSlug: 'shops'` makes that injected `tenant` field relate to the `shops` collection, so the value persisted into each tenant-scoped doc becomes a **`shops` `_id`** — i.e. the shop row id, exactly as the plan wants.
- The plugin also injects a `tenants` array field on the `users` collection (`tenantsArrayField`, default name `tenants`), whose rows relate to `tenantsSlug`. After the repoint those rows relate to `shops`. This is benign but is a data-shape change on `payload-users` that UNIFY-04/06 must account for (any seeded user→tenant assignments must be re-pointed to shop ids).
- `shops` already satisfies the plugin's only structural requirement — a title field: `admin: { useAsTitle: 'name' }` (`packages/cms/src/collections/shops.ts:22`), mirroring the `tenants` collection's `useAsTitle: 'name'` (`tenants.ts:13`).
- `cleanupAfterTenantDelete` defaults to `true`: deleting a shop will cascade-delete its tenant-scoped docs and strip it from users' tenant arrays. With shops as the tenant collection this is desirable (delete shop ⇒ delete its CMS content), but it is a behavioral change worth recording for UNIFY-06.

### Config delta required (for UNIFY-03/04)

```diff
- tenantsSlug: 'tenants',
+ tenantsSlug: 'shops',
```

Plus: delete the `tenants` collection from the barrel (`packages/cms/src/collections/index.ts:10,23,27`) and the `tenants.ts` file, and drop the `shopId` back-reference field once the bridge is gone.

**No plugin-level blocker.** The repoint is a supported configuration.

---

## Q2 — Do Mongoose `shops` and Payload `shops` ALREADY share ONE Mongo collection + identical `_id`?  *(highest-value finding)*

**Answer: YES — same physical collection `shops`, same `ObjectId` `_id`. `resolveTenantId` therefore collapses to an IDENTITY function under the repoint.**

### Same collection name

- **Mongoose:** `db.model('Shop', ShopSchema)` (`packages/db/src/models/shop.ts:666`). Mongoose pluralizes + lowercases the model name `Shop` → Mongo collection **`shops`**. No explicit collection override.
- **Payload:** `slug: 'shops'` with **no `dbName`** (`packages/cms/src/collections/shops.ts:21`). Payload's `@payloadcms/db-mongodb` adapter maps `slug` → collection name 1:1 unless `dbName` overrides it → Mongo collection **`shops`**.

Both bind to the same database (`mongooseAdapter({ url: mongoUrl })`, `packages/cms/src/config/index.ts:221`; `mongoose.connect(uri)`, `packages/db/src/db.ts:61`) on the same `MONGODB_URI`. Two separate mongoose connections, one physical collection.

### The decisive precedent — `users` was deliberately split, `shops` was not

`packages/cms/src/collections/build-users.ts:34-42` documents the exact slug→collection collision mechanism and the team's mitigation:

> *"`@nordcom/commerce-db` already owns the MongoDB `users` collection … If we let Payload also default to `users`, the two write to the same physical collection — Payload's create then fails Mongoose validation … `dbName` keeps Payload's slug stable … while routing storage to its own MongoDB collection."*

```ts
slug: 'users',
dbName: 'payload-users',   // build-users.ts:33,42
```

`shops` carries **no such `dbName`** (`shops.ts:21`) and its docblock states it *"Mirrors the MongoDB `Shop` document managed by `@nordcom/commerce-db`"* (`shops.ts:14-18`). The absence of `dbName` is therefore the **intentional unification choice**: Payload `shops` and Mongoose `shops` are meant to be the same physical collection. (Contrast `users`, where `dbName` was added precisely to keep them apart.)

### Same `_id` shape

- Mongoose `ShopSchema` uses the default `_id` (no custom `_id` declared; options are `{ id: true, timestamps: true }`, `shop.ts:655-658`) → **`ObjectId`**. `Shop.id` is the string virtual of that ObjectId (`packages/db/src/db.ts:19-21,56`).
- Payload's `db-mongodb` adapter defaults document IDs to **`ObjectId`** (the config comment confirms: *"Tenant IDs default to MongoDB ObjectIDs"*, `packages/cms/src/config/index.ts:245-246`). The collection sets no `idType: 'uuid'` override.

So the hex string `shop.id` (Mongoose) and a Payload `shops` doc `.id` are the **same value** for the same row.

### Consequence for `resolveTenantId`

Today `resolveTenantId` (`packages/cms/src/api/resolve-tenant-id.ts:35-59`) does a Mongo round-trip:

```ts
where: { shopId: { equals: shopId } }   // tenants → find the Tenant whose shopId back-ref matches
// returns Tenant._id, NOT shopId
```

It exists *only* because the plugin writes `Tenant._id` (not `Shop._id`) into the `tenant` field (`resolve-tenant-id.ts:14-22`). Once `tenantsSlug: 'shops'`, the `tenant` field holds the **shop row id**, which is exactly the `shopId` callers pass in. The function becomes:

```ts
const resolveTenantId = async (_payload, shopId) => shopId || null;   // identity
```

This is the major simplification the plan anticipated — confirmed by code.

---

## Q3 — Would `getTenantFromCookie` resolve the shop-row-id key correctly under the repoint?

**Answer: YES for the cookie read itself. One downstream call site must change collection `tenants` → `shops`.**

### The cookie read

The multi-tenant plugin sets a `payload-tenant` cookie holding the **selected tenant doc's id**
(`packages/cms/src/config/index.ts:238-246`). The only consumer in this repo is `filterAvailableLocales`:

`packages/cms/src/config/index.ts:248-249`:

```ts
const tenantId = getTenantFromCookie(req.headers, 'text');
```

- `getTenantFromCookie(headers, idType)` returns the raw cookie value; `idType: 'text'` returns it as a string verbatim (`'number'` would `parseInt`). Shop `_id`s are ObjectId hex strings, so `'text'` stays correct after the repoint — **no change needed to the `getTenantFromCookie` call.** The existing comment (`config/index.ts:245-246`) already notes tenant ids are ObjectIDs, which is unchanged.
- The cookie will simply now carry a `shops` `_id` instead of a `tenants` `_id`. Same shape (ObjectId hex), same `'text'` handling.

### The one required downstream change

`filterAvailableLocales` then resolves the doc to read its locale allow-list (`config/index.ts:252-257`):

```ts
const tenant = await req.payload.findByID({
    id: String(tenantId),
    collection: 'tenants',          // ← must become 'shops'
    depth: 0,
    req,
});
const allowed = tenant?.locales;    // ← shops has no top-level `locales`; see note
```

Under the repoint this must read from `shops`. Note a field-shape mismatch: `tenants` has a flat
`locales: string[]` field (`tenants.ts:24`), whereas the Mongoose/Payload `shops` shape stores only
`i18n.defaultLocale` (`shop.ts:251-263`, `shops.ts:40-43`) — there is **no `locales` array on shops**
(the sync hook reconstructs `locales` from `defaultLocale`, see `shop-sync/post-save-hook.ts:54`). So
UNIFY-04/06 must either (a) add a `locales` field to `shops`, or (b) change `filterAvailableLocales` to
derive the allow-list from `i18n.defaultLocale`. This is a small, contained follow-up — not a blocker.

---

## Q4 — Go/No-Go + chosen collapse mechanism

### Verdict: **GO**

**Rationale:** `tenantsSlug` is a free-form slug reference with no plugin-enforced field contract; `shops`
already satisfies its only requirement (`useAsTitle`); and Mongoose `shops` + Payload `shops` are proven
to be the same physical collection with identical `ObjectId` `_id`s — so the repoint makes the injected
`tenant` field carry the shop row id directly and `resolveTenantId` degrades to identity. The only
follow-ups are mechanical (one `findByID` collection swap + a `locales` source decision), not blockers.

### Chosen collapse mechanism (for UNIFY-03/04/06/11)

1. **UNIFY-03 — repoint the plugin.** `tenantsSlug: 'tenants'` → `'shops'` in
   `packages/cms/src/plugins/multi-tenant.ts:22`. The injected `tenant` relationship now `relationTo: 'shops'`
   and persists shop row ids into every tenant-scoped collection.
2. **UNIFY-04 — collapse `resolveTenantId` to identity.** Replace the `tenants`-lookup body
   (`resolve-tenant-id.ts:41-58`) with `return shopId || null;`. Keep the signature `(payload, shopId)`
   so the ~10 `get-*` call sites (`get-page.ts:54`, `get-pages.ts:45`, `get-header.ts:30`, `get-footer.ts:30`,
   `get-articles.ts:54`, `get-article.ts:38`, `get-business-data.ts:30`, `get-product-metadata.ts:43`,
   `get-collection-metadata.ts:43`) are untouched. The `WeakMap` cache becomes dead code — delete it.
   Update `filterAvailableLocales` (`config/index.ts:252`) to `findByID({ collection: 'shops' })` and
   source the locale allow-list from `i18n.defaultLocale` (or add a `locales` field to `shops`).
3. **UNIFY-05/06 — reconcile the shop reps + retire the sync.** Ensure the Payload `shops` field schema is a
   compatible superset of the Mongoose `ShopSchema` so both connections read/write the shared `shops`
   collection without validation conflicts (the `users`/`payload-users` split at `build-users.ts:42` is the
   cautionary precedent for what happens otherwise). Delete the `shop-sync` post-save hook
   (`packages/cms/src/shop-sync/post-save-hook.ts`) — it exists only to mirror shops into the `tenants`
   collection and becomes a no-op. Delete the `tenants` collection (`tenants.ts`) and its barrel entries
   (`collections/index.ts:10,23,27`). Re-point any Payload user→tenant array assignments to shop ids.
4. **UNIFY-11 — re-seed.** Update `seedCms` (`packages/test-mongo/src/seed/cms.ts`) so every tenant-scoped
   insert uses `tenant: <shopRowId>` directly instead of creating a `tenants` doc and using its `_id`
   (`cms.ts:58-104`). The `seedShop` fixture (`seed/shop.ts`) already creates the `shops` row whose `_id`
   becomes the tenant key — no change needed there.

---

## Runtime validation (recommended pre-UNIFY-03 step — NOT executed in this spike)

The spec calls for a throwaway proof: a `pages` read filtered `where: { tenant: { equals: <shopRowId> } }`
returning the seeded doc, with `tenantsSlug: 'shops'`.

**Code-analysis expected result:**

- **Today (before repoint):** the filter **returns nothing**. The `tenant` field holds `Tenant._id`, not
  `Shop._id` — this is precisely why `resolveTenantId` exists (`resolve-tenant-id.ts:21-22`:
  *"Without this translation, storefront filters using `where: { tenant: { equals: shop.id } }` never match anything."*).
- **After `tenantsSlug: 'shops'` + re-seed (UNIFY-03/11):** the seeded `pages` doc is written with
  `tenant: <shopRowId>`, so `where: { tenant: { equals: <shopRowId> } }` **matches and returns the doc**.
  The shop row (now the tenant) is the same physical `shops` doc seeded by `seedShop`, so the id used to
  insert and the id used to filter are identical (Q2).

**Why not executed here:** per the task's ENV note, booting Payload/Mongo is forbidden in this spike (a prior
agent hung on long-running `pnpm` server processes). The outcome above is derived from code; the live
round-trip should be run as the first validation gate of UNIFY-03:

1. Set `tenantsSlug: 'shops'`, boot the admin/test Mongo.
2. Seed a shop (`seedShop`) + re-seeded CMS docs keyed by the shop row id.
3. `payload.find({ collection: 'pages', where: { tenant: { equals: <shopRowId> } } })` → assert 1 doc returned.
4. Assert the active config has `tenantsSlug === 'shops'`.

If that live check passes, the GO verdict is fully confirmed end-to-end.

---

## Evidence index

| Claim | File:line |
| --- | --- |
| Plugin config, `tenantsSlug: 'tenants'` today | `packages/cms/src/plugins/multi-tenant.ts:21-25` |
| Payload `shops` slug, no `dbName`, `useAsTitle` | `packages/cms/src/collections/shops.ts:21-22` |
| Payload `shops` "mirrors the MongoDB Shop document" | `packages/cms/src/collections/shops.ts:14-18` |
| `tenants` collection slug + `shopId` back-ref | `packages/cms/src/collections/tenants.ts:12,26` |
| Mongoose `Shop` model → `shops` collection | `packages/db/src/models/shop.ts:666` |
| Mongoose `Shop` `_id` is default ObjectId | `packages/db/src/models/shop.ts:655-658`; `packages/db/src/db.ts:19-21,56` |
| `users`/`payload-users` `dbName` split precedent | `packages/cms/src/collections/build-users.ts:33-42` |
| `resolveTenantId` current `tenants` lookup | `packages/cms/src/api/resolve-tenant-id.ts:35-59` |
| Why the bridge exists (filter never matches without it) | `packages/cms/src/api/resolve-tenant-id.ts:14-22` |
| `getTenantFromCookie` call + `idType: 'text'` | `packages/cms/src/config/index.ts:248-249` |
| `filterAvailableLocales` `findByID({ collection: 'tenants' })` | `packages/cms/src/config/index.ts:252-257` |
| Tenant ids default to ObjectIDs (config comment) | `packages/cms/src/config/index.ts:245-246` |
| Payload adapter binds same DB as Mongoose | `packages/cms/src/config/index.ts:221`; `packages/db/src/db.ts:61` |
| shop-sync post-save hook (to be deleted) | `packages/cms/src/shop-sync/post-save-hook.ts:42-72` |
| `seedCms` creates Tenant doc + uses its `_id` | `packages/test-mongo/src/seed/cms.ts:58-104` |
| `seedShop` creates the Mongoose shop row | `packages/test-mongo/src/seed/shop.ts:56-102` |
