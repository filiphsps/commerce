/**
 * Public function-constructor barrel for `@nordcom/commerce-convex`.
 *
 * This is the ONLY constructor surface apps and `packages/db` are meant to import from. It deliberately
 * re-exports exactly nine builders — the two tenant-scoped constructors ({@link tenantQuery},
 * {@link tenantMutation}), the two customer-tier constructors ({@link authedQuery},
 * {@link authedMutation}) for identity-bearing-but-tenant-less storefront customers, the
 * Clerk-operator constructor ({@link clerkMutation}) for the first-sign-in `ensureCurrentUser` path
 * (a Clerk-authenticated operator whose `users` row does not exist yet, so the tenant/customer tiers
 * cannot apply), the two server-trusted system-tier constructors ({@link systemQuery},
 * {@link systemMutation}), and the two shared-secret server-trust constructors ({@link serverQuery},
 * {@link serverMutation}) for the identity-less `packages/db` seam — and NOTHING from `_generated/server`.
 *
 * The omission is the point: the raw `query` / `mutation` / `internalQuery` / `internalMutation`
 * builders from `_generated/server` bypass row-level security entirely (no tenant pinning, raw `ctx.db`).
 * By withholding them here, a consumer reaching for the barrel CANNOT construct an RLS-bypassing function;
 * the only way to obtain a raw builder is the explicit, named system-tier escape hatch, which carries its
 * own sanctioned-exemption contract. Keeping the raw builders unreachable through the documented
 * entrypoint makes the safe path the default path.
 */

export { authedMutation, authedQuery } from './lib/authed';
export { clerkMutation } from './lib/clerk';
export { serverMutation, serverQuery } from './lib/server';
export { systemMutation, systemQuery } from './lib/system';
export { tenantMutation, tenantQuery } from './lib/tenant';
