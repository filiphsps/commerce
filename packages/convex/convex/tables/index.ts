import type { TableDefinition } from 'convex/server';

import { authTables } from './auth';
import { cmsContentTables } from './cms';
import { revalidationTables } from './revalidation';
import { reviewsTables } from './reviews';
import { shopTables } from './shops';

/**
 * Aggregation point for the schema's per-group table maps. `schema.ts` spreads the named groups
 * exported here into a single `defineSchema`, so adding a table group never edits `schema.ts`'s body
 * (see `schema.ts` for the full convention). A table-group task creates an isolated `tables/<group>.ts`
 * exporting a `Record<string, TableDefinition>` and wires it into the matching group below via spread —
 * keeping per-group work on separate files and out of each other's way.
 *
 * Both groups are intentionally empty until the first table-group task lands: the scaffold establishes
 * the spread convention without committing any tables yet, so codegen reflects an empty-tables schema.
 */

/**
 * Platform/core table groups (shops, identities, sessions, feature flags, reviews, …). Spread future
 * `tables/<group>.ts` maps in here, e.g. `...shopsTables`.
 *
 * `authTables` (users/sessions/identities) and `reviewsTables` are platform-global, NOT tenant-scoped,
 * so they belong in this core group rather than any tenant grouping (auth rows live above any single
 * shop; the review→shop link is an id ref, not a tenant partition). `shopTables` carries the collapsed
 * shop==tenant `shops` row plus its credential/domain/collaborator/feature-flag side tables and the
 * platform-global `featureFlags` — its tenant-scoped members enforce the `by_shop` index convention.
 *
 * `revalidationTables` (the Convex→Next revalidation bridge's dedup ledger + per-(tenant,collection)
 * coalescing buffer) is platform-global bridge infrastructure written only by the server-trusted
 * system tier, so it belongs here rather than in any tenant grouping; it keys on the string tenant id
 * from the publish payload, not a `v.id('shops')` foreign key.
 */
export const coreTables: Record<string, TableDefinition> = {
    ...authTables,
    ...revalidationTables,
    ...reviewsTables,
    ...shopTables,
};

/**
 * Reserved extension point for CMS-owned table groups (pages, media, rich content, …). Kept distinct
 * from {@link coreTables} so CMS table-group tasks (CMSDATA-*, CMSMEDIA-01, CMSRICH-01) wire their
 * `tables/<group>.ts` maps in here without touching the core slot or `schema.ts`.
 *
 * `cmsContentTables` is generated from the CMS field descriptors by `pnpm cms:gen`
 * (`tables/cms.ts`); never edit that file by hand — the `cms:gen:check` drift gate fails on
 * uncommitted divergence.
 */
export const cmsTables: Record<string, TableDefinition> = {
    ...cmsContentTables,
};
