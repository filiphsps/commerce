# Phase 0 Exit Gate (G0) — Migration-1 verification & ship sign-off

Task: UNIFY-10. Branch: `feat/convex-migration`. Run LAST against the settled
tree. This is the non-skippable kill-gate for Phase 0 (the shop==tenant
collapse): the dedicated `tenants` collection and its `attachShopSync` mirror
are gone, every tenant-scoped read resolves `tenant` to the shop row id, reviews
relate to their shop by `shopId`, collaborators resolve via the join key, and
feature-flag reads work — all while the storefront CMS read contract stays
byte-identical (null-on-missing preserved).

No source change was required inside the edit scope
(`packages/cms/src/api`, `packages/db/src/services`): the tree was already
settled by Waves 1-4. This file is the written sign-off plus honest deferral of
the lines that cannot run in-sandbox.

---

## 1. Assertions & evidence

### A. `attachShopSync` / `syncShopToTenant` are gone from code

```
$ grep -rn 'attachShopSync\|syncShopToTenant' --include='*.ts' . | grep -v '\.specs/'
(no output — exit 1)
```

EMPTY across all `*.ts` (excluding `.specs/`). The two source units that used
to host the mirror are deleted:

```
$ ls packages/cms/src/shop-sync          -> No such file or directory
$ ls packages/cms/src/collections/tenants.ts -> No such file or directory
```

`packages/cms/package.json` exposes no `./shop-sync` export. Remaining matches
are NON-CODE prose only — `.specs/**`, `packages/cms/README.md`, and two
`collections.mdx` files — describing the OLD architecture. See Concerns; they
are doc debt, not a G0 code gap, and are outside this task's edit scope.

### B. The `tenants` collection / slug write path is gone — read path is shop-id identity

There is no `TenantModel` and no Mongoose model whose collection is `tenants`
(`packages/db/src/models/index.ts` exports only feature-flag, identity, review,
session, shop, user). The only surviving `'tenants'` token is the deliberate
compatibility shim:

- `packages/cms/src/legacy-tenants-slug.ts:16` — `LEGACY_TENANTS_SLUG = 'tenants' as CollectionSlug`.
  UNIFY-03 repointed the multi-tenant plugin's `tenantsSlug` onto `shops`
  (`packages/cms/src/plugins/multi-tenant.ts:27` → `tenantsSlug: 'shops'`), so
  the plugin writes the shop row's own `_id` into every tenant-scoped doc's
  `tenant` field. The constant only survives so the admin editor manifest
  (`packages/cms/src/editor/manifests/tenants.ts:8`) keeps a stable slug.

The storefront/admin tenant resolution is therefore identity over the shop id —
`packages/cms/src/api/resolve-tenant-id.ts:39-63`: `resolveTenantId(payload,
shopId)` confirms the row exists in the unified `shops` collection
(`where: { id: { equals: shopId } }`) and returns that same id, or `null` when
empty/absent. No separate tenant-document translation remains.

### C. Reviews read via `shopId`

`packages/db/src/services/review.ts:28-33` — `ReviewService.findByShop(shopId,
{ count })` queries `ReviewModel.find({ shop: shopId })`. The `shop` field is a
string id ref (no embedded shop snapshot); frozen by the service-seam contract
`packages/db/src/services/service-seam-contract.snapshot.ts:214`
(`Expect<Equal<ReviewBase['shop'], string>>`) and exercised by
`packages/db/src/services/review.test.ts` ("carries `shop` through as a string
id ref"). `findAll({ tenant })` retains a now-dead `tenant` filter only to keep
the pinned signature (review.ts:48-55) — documented as matching zero docs.

### D. Feature-flag reads work

`packages/db/src/services/feature-flag.ts` — `findByKey(key)` →
`FeatureFlagModel.findOne({ key })` returning the flag or `null` on a miss
(feature-flag.ts:24-27); `findAll()` → all flags (feature-flag.ts:38-41).
Pinned by service-seam-contract.snapshot.ts:200-201 and verified by
`packages/db/src/services/feature-flag.test.ts` (findByKey hits `findOne` with
the key, returns null on no match; findAll maps every doc).

### E. Collaborators read over the join

`packages/db/src/services/shop.ts:97-100` — `ShopService.findByCollaborator({
collaboratorId })` queries `ShopModel.find({ 'collaborators.user':
collaboratorId })`, matching against the de-embedded `collaborators[].user`
join key (a plain user-id ref, not an embedded user doc). Pinned by
service-seam-contract.snapshot.ts:190.

### F. Per-package gates green (the in-sandbox equivalent of `build:packages && typecheck && test`)

`@nordcom/commerce-cms`:
```
tsc -p tsconfig.json --noEmit   -> CMS_TSC_EXIT=0
vitest run                      -> Test Files 65 passed (65); Tests 543 passed (543); CMS_VITEST_EXIT=0
biome lint src/api src/services -> Checked 35 files, no fixes; BIOME_EXIT=0 (shared with db scope)
```

`@nordcom/commerce-db`:
```
tsc -p tsconfig.json --noEmit   -> DB_TSC_EXIT=0
vitest run                      -> Test Files 12 passed (12); Tests 257 passed | 3 skipped (260); DB_VITEST_EXIT=0
```

Biome lint of `packages/cms/src/api packages/db/src/services` (35 files): no
fixes, exit 0.

### G. No changeset

`@nordcom/*` packages are in `.changeset/config.json`'s `ignore` list — no
changeset is created or required for this verification task.

---

## 2. Parity shapes — storefront CMS read contract (pre/post unification)

The shop==tenant collapse must leave every storefront read byte-identical. Two
hand-written, compile-checked snapshots plus a runtime golden test freeze both
sides; all pass on the settled tree.

### Input side (signatures) — `packages/cms/src/api/cms-read-contract.snapshot.ts`

11 getters frozen. Single-doc getters keep `(args) => Promise<Doc | null>`; list
getters keep `(args) => Promise<PaginatedDocs<Doc>>` (frozen via `.docs`);
`resolveTenantId` is `[Payload, string] => Promise<string | null>`. Drift flips
an `Expect<Equal<…>>` element and fails typecheck (TS2344). CMS_TSC_EXIT=0.

### Output side (runtime shape) — `packages/cms/src/api/cms-read-contract.golden.test.ts`

PRE and POST shapes are identical — this is the parity assertion:

| Read getter | Args (post) | Return shape (post) | Null-on-missing |
| --- | --- | --- | --- |
| getPage / getArticle | `{ shop, locale, slug, draft?, __payload? }` | exact populated doc (depth-2 relations stay nested objects, e.g. `blocks[].items[].image` is the `MEDIA` object, not an id) | `null` |
| getHeader / getFooter / getBusinessData | `{ shop, locale, __payload? }` | exact singleton doc | `null` |
| getProductMetadata / getCollectionMetadata | `{ shop, locale, shopifyHandle, __payload? }` | exact doc | `null` |
| getPages / getArticles | `{ shop, locale, __payload? }` | full paginated envelope `{ docs, totalDocs, page, hasNextPage, hasPrevPage, … }` | `docs: []` (never throws) |
| resolveLink | `(LinkValue, { locale })` | `string` (6 link kinds; unpopulated relation → `''`, never throws) | `''` |
| resolveTenantId | `(payload, shopId)` | shop id for an existing row | `null` |

Null-on-missing is preserved in BOTH miss branches and is the load-bearing
parity invariant (so a missing doc never 404s the host page):

1. Doc-absent — `getPage(... slug: 'absent')` and the six siblings resolve to
   `null`; `getPages`/`getArticles` resolve to `{ docs: [] }`
   (golden.test.ts:253-320).
2. Shop-unresolved — `resolveTenantId` returns `null`, the getter short-circuits
   BEFORE the content query (`if (!tenantId) return null;`,
   `get-page.ts:53-54`), so an unknown shop yields the same `null` / empty
   envelope rather than a cross-tenant leak or a throw.

The post-collapse difference is internal only: `resolveTenantId` collapsed from
shop→tenant-document translation to identity over the shop id
(golden.test.ts:352-363 — "returns the shop id for an existing shop"). Every
storefront-observable arg and return shape above is unchanged.

### Service-seam parity — `packages/db/src/services/service-seam-contract.snapshot.ts`

The 6 service singletons (`Identity`, `Session`, `User`, `Shop`, `Review`,
`FeatureFlag`) and their `OnlineShop` / `ShopBase` / `ReviewBase` return shapes
are frozen for the ~183 importers. Notably `ReviewBase['shop']` is pinned to
`string` (id ref) per the shop==tenant collapse (UNIFY-06). DB_TSC_EXIT=0.

---

## 3. DEFERRED TO CI / OPERATOR — must be green before G0 is truly signed off

The literal acceptance line cannot run in this sandbox (full `pnpm build` /
`pnpm test` HANG on a pre-existing `react-payment-brand-icons` build break;
`pnpm test:e2e` requires a MongoDB daemon). The in-sandbox equivalent above
(per-package tsc + vitest + biome lint for `packages/cms` and `packages/db`) is
green. The following MUST be confirmed green by CI / the operator before
declaring G0 passed:

1. `pnpm build:packages` — full workspace build (currently blocked locally by
   the `react-payment-brand-icons` break; verify CI's build of
   `@nordcom/commerce-cms` and `@nordcom/commerce-db` from built `dist/` is
   green, since dependent apps import the built artifacts).
2. `pnpm typecheck` — turbo-wide typecheck across every workspace (sandbox ran
   only the two in-scope packages).
3. `pnpm test` — turbo-wide vitest across every workspace (sandbox ran only
   `@nordcom/commerce-cms` and `@nordcom/commerce-db`).
4. `pnpm test:e2e` seed — boot the in-process MongoDB
   (`@nordcom/commerce-test-mongo`), seed the canonical fixture
   (`packages/test-mongo/src/seed/fixtures/shop.ts`, `nordcom-demo-shop.com`),
   and confirm storefront CMS reads resolve over the unified `shops` row with no
   `tenants` collection present.
5. `pnpm cms:gen:check` — regenerated CMS action types must be drift-free
   (the multi-tenant `tenantsSlug: 'shops'` repoint affects generated action
   wrappers).

---

## 4. Verdict

All in-sandbox-verifiable G0 assertions hold on the settled tree:
attachShopSync/syncShopToTenant absent from code, no `tenants`
collection/model/write path, tenant resolution is shop-id identity, reviews via
`shopId`, feature-flags read, collaborators via the join, and the storefront CMS
read contract (input signatures + runtime output shapes + null-on-missing) is
frozen and passing. No changeset required.

G0 is GREEN pending the CI/operator-only lines in section 3.
