import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';

import { internalMutation, internalQuery } from '../_generated/server';

/**
 * No-op context customization shared by {@link systemQuery} and {@link systemMutation}. It returns
 * an empty patch, so the underlying `ctx` — including the RAW `ctx.db` — passes through UNCHANGED.
 *
 * This is the whole point of the "system" tier: where the forthcoming tenant tier (`tenantQuery`/
 * `tenantMutation`, CONVEXCORE-06/07) will replace `ctx.db` with a row-level-security (RLS) wrapped
 * reader/writer that fail-closed denies cross-tenant access, the system tier deliberately leaves
 * `ctx.db` raw. Built as an explicit constructor (rather than re-exporting `internalQuery`/
 * `internalMutation` directly) so that the no-RLS escape hatch reads as a deliberate, named decision
 * at every call site and stays distinct from the RLS-wrapped default once that default exists.
 */
const rawDbCtx = customCtx(() => ({}));

/**
 * Server-trusted query constructor that exposes the RAW `ctx.db` with NO tenant row-level-security
 * (RLS) wrapping. Built on `internalQuery`, so functions defined with it are `"internal"` visibility:
 * callable only from other Convex functions (crons, actions, other internal functions, migrations),
 * NEVER from the public client surface. This is intentional — raw, un-scoped db access must never be
 * reachable from untrusted app code.
 *
 * Use ONLY for the explicitly-sanctioned exemption categories below. Every other read path must go
 * through the tenant tier (`tenantQuery`, CONVEXCORE-06) once it lands, which scopes reads to the
 * resolved shop. Reaching for `systemQuery` outside these categories defeats tenant isolation.
 *
 * Sanctioned exemptions (each MUST originate server-side, never from the public app barrel):
 * - **Crons / scheduled jobs.** Background maintenance (e.g. the snapshot-export cron, expired-session
 *   reaping) runs with no tenant context, so it cannot be tenant-scoped.
 * - **Migrations / backfills.** The Mongo→Convex import and any later data migration write and read
 *   across every tenant at once, by definition above the tenant boundary.
 * - **Shop resolution.** `resolveShop` / `byDomainWithCredentials` map an inbound hostname to its
 *   shop row BEFORE any tenant context exists — they are the step that ESTABLISHES the tenant, so
 *   they cannot themselves be tenant-scoped (the classic bootstrap exemption).
 * - **Platform-global auth tables.** `users`, `sessions`, and `identities` live above any single shop
 *   (a user and its sessions/OAuth identities are not partitioned by shop), so they carry no `shop`
 *   foreign key and are not tenant-scopable. The Auth.js adapter reads them server-side.
 * - **Global feature flags.** `featureFlags` (a platform-global table NOT yet added — see
 *   CONVEXCORE-05, which landed users/sessions/identities/reviews only; this is a FORWARD exemption
 *   to honor once that table exists) are evaluated platform-wide, not per tenant.
 * - **Super-user.** Platform-operator tooling that intentionally spans tenants for support/admin.
 *
 * @returns A query builder whose handler receives a `ctx` with the raw, un-RLS-wrapped `ctx.db`.
 */
export const systemQuery = customQuery(internalQuery, rawDbCtx);

/**
 * Server-trusted mutation constructor that exposes the RAW `ctx.db` with NO tenant row-level-security
 * (RLS) wrapping. The write-side companion to {@link systemQuery}: built on `internalMutation`, so
 * functions defined with it are `"internal"` visibility (server-callable only, never from the public
 * client surface) and can write across the db with no tenant partitioning.
 *
 * Use ONLY for the same sanctioned exemption categories enumerated on {@link systemQuery} (crons,
 * migrations, shop resolution, the platform-global auth tables, global feature flags, super-user).
 * Every other write path must go through the tenant tier (`tenantMutation`, CONVEXCORE-07) once it
 * lands.
 *
 * @returns A mutation builder whose handler receives a `ctx` with the raw, un-RLS-wrapped `ctx.db`.
 */
export const systemMutation = customMutation(internalMutation, rawDbCtx);
