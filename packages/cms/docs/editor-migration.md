---
title: Bridge to editor migration
sidebar_position: 8
---

# Bridge to editor migration

> **Status:** Temporary. This page documents the Phase 2 cutover of the
> Mongoose bridge to the unified editor system. It will be removed once
> Phase 3 lands and the cutover is no longer recent context.

## What changed

The `packages/cms/src/bridge/` subsystem and the four
`@nordcom/commerce-cms/bridge*` subpath exports were deleted. The
Mongoose-backed `Shop`, `Review`, and `FeatureFlag` entities now live in
Payload collections (`shops`, `reviews`, `feature-flags`); the corresponding
`@nordcom/commerce-db` services keep their public types and method signatures
but call `payload.local` internally.

## Migration playbook

Run this **once per environment** before deploying the Phase 2 code:

```bash
pnpm migrate:mongoose-to-payload
```

The script is idempotent: re-running skips docs that already exist in the
target Payload collections (keyed by `domain` for shops, `key` for feature
flags, embedded `shop.domain` for reviews).

Failure modes:
- `"no Payload shop for domain=X, skipping review …"` — the review's embedded
  shop didn't migrate first. Re-run the script; shops are migrated before
  reviews so this only triggers on a partial first run.
- Validation errors — fields the Payload collection rejects (e.g. malformed
  enum values). Check the Payload collection config and fix the input data.

## What stayed

- `packages/db/src/models/{shop,review,feature-flag}.ts` — Mongoose schemas
  remain defined so the migration script can read from them. A follow-up
  commit deletes them after all environments have migrated.
- `Shop.findByDomain`, `Shop.findById`, `Shop.findAll`,
  `Shop.findByCollaborator`, `Review.findByShop`, `Review.findAll`,
  `FeatureFlag.findByKey`, `FeatureFlag.findAll` — public service surface
  unchanged. Storefront callsites do not move.

## What's gone

- `packages/cms/src/bridge/` (entire directory).
- `@nordcom/commerce-cms/bridge*` subpath exports.
- `buildBridgePlugin(defaultManifests)` registration in `buildPayloadConfig`.
- `includeBridge` option on `buildPayloadConfig`.
- `apps/admin/src/lib/cms-actions/shop.ts` (replaced by `_generated/shops.ts`).
- `BridgeEditPage`, `BridgeFields`, `BridgeFormToolbar`,
  `createBridgeServerActions`, `mongooseAdapter` — all replaced by their
  editor equivalents.

## Where to look if a shop edit / review / feature flag isn't working

1. Verify the migration ran in this environment (`pnpm migrate:mongoose-to-payload`
   logs `[migrate] done`).
2. Verify the manifest is registered: `grep allManifests packages/cms/src/editor/manifests/index.ts`.
3. Verify the `_generated/` wrapper exists: `ls apps/admin/src/lib/cms-actions/_generated/`.
4. Run `pnpm cms:gen:check` — drift between manifests and `_generated/` will
   surface here.

## Phase 3 follow-ups

- Delete `packages/db/src/models/{shop,review,feature-flag}.ts` once all
  environments have migrated.
- This `editor-migration.md` page can be deleted at the same time.
