import type { TableDefinition } from 'convex/server';

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
 */
export const coreTables: Record<string, TableDefinition> = {};

/**
 * Reserved extension point for CMS-owned table groups (pages, media, rich content, …). Kept distinct
 * from {@link coreTables} so CMS table-group tasks (CMSDATA-*, CMSMEDIA-01, CMSRICH-01) wire their
 * `tables/<group>.ts` maps in here without touching the core slot or `schema.ts`.
 */
export const cmsTables: Record<string, TableDefinition> = {};
