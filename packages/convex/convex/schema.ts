import { defineSchema } from 'convex/server';

import { cmsTables, coreTables } from './tables';

/**
 * Convex schema for `@nordcom/commerce-convex`, composed by SPREADING the named per-group table maps
 * from `tables/` (see `tables/index.ts`) into a single `defineSchema`. This file's body is a fixed
 * composition that table-group tasks MUST NOT edit; it exists so parallel table work never collides on
 * one file.
 *
 * Conventions for adding tables:
 *
 * 1. Table groups. A table-group task (CONVEXCORE-04/05, CMSDATA-*, CMSMEDIA-01, CMSRICH-01,
 *    BRIDGE-04/07/08, …) adds an ISOLATED `tables/<group>.ts` exporting a `Record<string,
 *    TableDefinition>` and wires it into `coreTables` (platform tables) or `cmsTables` (CMS-owned
 *    tables) in `tables/index.ts` via spread. The `cmsTables` slot below is the reserved CMS extension
 *    point. Never add a table directly to this `defineSchema` call.
 *
 * 2. Tenant-index naming. This platform is multi-tenant by shop, so every tenant-scoped table indexes
 *    its shop foreign key first. Name such indexes `by_shop_<field>` and list `shop` as the leading
 *    index field — e.g. `.index('by_shop_handle', ['shop', 'handle'])`. A pure shop scan uses
 *    `by_shop`. This keeps tenant isolation legible and queries forced through the shop boundary.
 */
export default defineSchema({
    ...coreTables,
    ...cmsTables,
});
