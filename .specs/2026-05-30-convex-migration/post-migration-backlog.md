# Post-migration backlog (POLISH-06 consistency sweep)

Structural findings from the final consistency sweep — items that would change
behavior, public API, or contracts and therefore did NOT ship with the sweep
commit. Small drift (stale comments, dead exports, doc gaps) was fixed in the
sweep commit itself.

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

## 4. Auth.js adapter stubs log `[TODO]` instead of persisting

`apps/admin/src/utils/auth.adapter.ts:108,112,130,134,196` —
`updateUser`/`deleteUser`/`updateSession`/`deleteSession`/`unlinkAccount` are
`console.debug('[TODO] …')` no-ops. JWT-strategy flows don't exercise them
today, but they are silent data-loss traps if a flow starts calling them.
Suggested shape: implement against the `packages/db` identity/session services
or make them throw a typed `@nordcom/commerce-errors` error so a future caller
fails loudly.

## 5. Account header placeholder pending the live-island default-on

`apps/storefront/src/components/header/header-account-section.tsx:53` renders
an empty `<Fragment />` instead of a skeleton while
`STOREFRONT_ACCOUNT_LIVE_ISLAND` stays a kill switch. Suggested shape: ship the
skeleton when the flag flips default-on (LANE-2 follow-up); pure UI but
flag-coupled, so tracked here rather than patched mid-sweep.

## 6. Missing commerce-provider domain degrades silently

`apps/storefront/src/components/providers-registry.tsx:41` — a Shopify shop
without `commerceProvider.domain` renders without the cart provider behind a
TODO. Suggested shape: surface it as tenant-config validation at shop lookup
(per the TODO) so the misconfiguration fails at resolve time, not as a
checkout-less storefront.

## 7. Admin shell subnav/inspector flags are hardcoded TODOs

`apps/admin/src/components/shell/shell-root.tsx:59-60` — `hasSubnav`/
`hasInspector` derive from segment presence with bare `// TODO` markers from
the shell rework. Suggested shape: fold into the shell-rework follow-up that
also covers finding #3.
