# Post-migration backlog (POLISH-06 consistency sweep)

Structural findings from the final consistency sweep — items that would change
behavior, public API, or contracts and therefore did NOT ship with the sweep
commit. Small drift (stale comments, dead exports, doc gaps) was fixed in the
sweep commit itself.

**Status (polish-completion pass, 2026-06-13).** Findings 3–7 — the
behavior/contract bugs — are RESOLVED (each item notes its fix below). Findings
1–2 remain OPEN by design: they are deliberate public-API (semver) decisions, not
drift, so they stay for a dedicated minor/major bump rather than a cleanup pass.
Separately, the pre-existing `react-payment-brand-icons` build red recorded in the
G5 gate §4 was root-caused (stale gitignored `.js` artifacts from an earlier
generator; the generator now wipes its `icons/` output before re-emitting) and is
green.

Sweep method: repo-wide `rg` for deleted-module names (`payload-ctx`,
`_cms-shadow`, `_normalize-payload`, `build-cms-form-state`,
`revalidateForManifest`, `get-payload-instance`, `test-mongo`,
`seedPayloadPrincipal`) and pre-migration terms (`Payload`, `Mongoose`,
`Mongo`); TODO/FIXME scan over the migration-touched dirs; manual knip-style
zero-importer check on the four seam barrels (`packages/convex/convex/_constructors.ts`,
`packages/cms/src/editor/index.ts`, `packages/db/src/index.ts`,
`packages/test-convex/src/index.ts`); and a two-way diff of `CONVEX_*` env
template/README documentation vs `process.env`/`getServerEnv` reads.

## 1. cms editor barrel re-exports with zero external importers

`packages/cms/src/editor/index.ts` re-exports several names no workspace
imports through the barrel (all current uses are relative imports inside
`src/editor/`): `bridgeErrorCode`, `EditorBridgeErrorCode`, `pickByFieldNames`,
`loadRelationshipOptions`, `relationshipTargetsOf`, `refreshEditorPaths`,
`RefreshEditorPathsArgs`, `docUrlSegment`, plus type-only companions
(`EditorActions`, `EditorDocumentTarget`, `EditorCollectionSchema`,
`FormFieldState`, `EditorAccess`, `EditorAccessCtx`, `EditorListColumn`, the
shell-prop/runtime types `CollectionTableShellProps`, `DocumentFormShellProps`,
`EditorToolbarShellProps`, `EditorMediaUploadAction`, `WithRuntime`,
`AuthedEditorCtx`, `AuthedUser`, `BuildFormStateArgs`).

Not trimmed here: this is the editor's public seam — `packages/cms/docs/*.mdx`
documents barrel imports (`defineCollectionEditor`, the access helpers,
`CollectionEditorManifest`, …) and the type companions parameterize exported
values, so a trim is a deliberate public-API (semver) decision, not drift
cleanup. Suggested shape: decide the supported `@nordcom/commerce-cms/editor`
surface, trim the rest in one minor/major bump, and add a docs example or test
importing each name that stays.

## 2. `@nordcom/commerce-convex` `./constructors` subpath has no workspace importer

`packages/convex/package.json` exports `./constructors`
(`convex/_constructors.ts`) and the README presents it as the seam other
workspaces import — but every consumer today is inside `packages/convex` via
relative `./_constructors` imports; no app or package imports the subpath.
Suggested shape: either keep it as the sanctioned future seam (and say so in
the README table) or drop the subpath export. Keeping is harmless; dropping is
an API change — hence logged, not fixed.

## 3. Admin shell: shop switcher exposes all shops to every operator

`apps/admin/src/lib/shops-for-user.ts:14` — `TODO(shell-rework)`: scoping by
`user.tenants` is unimplemented; `getShopsForUser(_userId)` ignores its
argument (underscore-suppressed param) and returns every shop. Behavior change
+ convention violation in one. Suggested shape: resolve membership through the
tenant join the active-shop resolver (`auth/admin-shop-resolver.ts`) already
walks, drop the underscore param, and gate the switcher list on it.

**Resolved (2026-06-13).** `getShopsForUser(userId)` now resolves through
`Shop.findByCollaborator({ collaboratorId: userId })` — the same
`shopCollaborators` membership the Convex `resolveActiveAdminShopId` token mint
re-verifies, and identical to the already-correct `utils/fetchers.ts` getter.
Underscore param dropped; covered by `shops-for-user.test.ts`.

## 4. Auth.js adapter stubs log `[TODO]` instead of persisting

`apps/admin/src/utils/auth.adapter.ts:108,112,130,134,196` —
`updateUser`/`deleteUser`/`updateSession`/`deleteSession`/`unlinkAccount` are
`console.debug('[TODO] …')` no-ops. JWT-strategy flows don't exercise them
today, but they are silent data-loss traps if a flow starts calling them.
Suggested shape: implement against the `packages/db` identity/session services
or make them throw a typed `@nordcom/commerce-errors` error so a future caller
fails loudly.

**Resolved (2026-06-13) — fail-loud option.** All five now throw `TodoError`
(the same typed error the Convex-backed db seam already throws for unsupported
operations) instead of no-op'ing. Implementing them was rejected: the seam is
deliberately frozen to the JWT-strategy vocabulary (create + the id/email/provider
lookups + `$push`-identity) and exposes no user/session update-or-delete mutation,
so wiring these would balloon the public Convex surface for paths the JWT strategy
never calls. Covered by `auth.adapter.test.ts`.

## 5. Account header placeholder pending the live-island default-on

`apps/storefront/src/components/header/header-account-section.tsx:53` renders
an empty `<Fragment />` instead of a skeleton while
`STOREFRONT_ACCOUNT_LIVE_ISLAND` stays a kill switch. Suggested shape: ship the
skeleton when the flag flips default-on (LANE-2 follow-up); pure UI but
flag-coupled, so tracked here rather than patched mid-sweep.

**Resolved (2026-06-13).** The skeleton now takes `shop` and gates on the same
`accounts-functionality` flag (`.evaluate(shop)`, the cache-safe sync read) as
the live section — so it renders an avatar-footprint placeholder when accounts
are enabled and `null` otherwise, never flashing on accounts-off shops. The
header Suspense fallback passes `shop` through. Covered by
`header-account-section.test.tsx`.

## 6. Missing commerce-provider domain degrades silently

`apps/storefront/src/components/providers-registry.tsx:41` — a Shopify shop
without `commerceProvider.domain` renders without the cart provider behind a
TODO. Suggested shape: surface it as tenant-config validation at shop lookup
(per the TODO) so the misconfiguration fails at resolve time, not as a
checkout-less storefront.

**Resolved (2026-06-13).** `CommerceProvider` now throws
`ShopMisconfigurationError(shop.domain, ['commerceProvider.domain'])` instead of
silently falling through to a checkout-less tree. The server resolve path already
fails the same way first (`ShopifyApolloApiClient` throws the identical error
before this client tree mounts — `api/shopify.ts:52`), so this is the matching
client-side guard. The now-stale "degraded to passthrough" comment in
`utils/trackable.tsx` was corrected. (The unrelated `checkoutDomain || 'TODO'`
hack in `trackable.tsx:482` is a separate pre-existing item, left untouched.)

## 7. Admin shell subnav/inspector flags are hardcoded TODOs

`apps/admin/src/components/shell/shell-root.tsx:59-60` — `hasSubnav`/
`hasInspector` derive from segment presence with bare `// TODO` markers from
the shell rework. Suggested shape: fold into the shell-rework follow-up that
also covers finding #3.

**Resolved (2026-06-13).** The bare `!!segments` test was a real bug: the
`@subnav`/`@inspector` slots are `default.tsx`-only, and Next's
`getSelectedLayoutSegmentPath` always rides the `'__DEFAULT__'` placeholder along
(it strips only the `__PAGE__` leaf), so `useSelectedLayoutSegments(slot)` returns
the always-truthy `['__DEFAULT__']` for the empty root default — mounting a blank
panel on every route. Replaced with an exported, unit-tested `isSlotActive()`
predicate that treats a slot as active only when some segment is a real section
(not the `__DEFAULT__` placeholder). Verified against the installed Next 16.2.6
source. Covered by `shell-root.test.tsx`.
