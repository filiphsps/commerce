import type { CollectionSlug } from 'payload';

/**
 * The dedicated `tenants` collection was deleted in UNIFY-03 — the multi-tenant
 * plugin now keys on `shops` (shop == tenant, keyed on the shop row id). A few
 * references still target the old slug until their owning migration task removes
 * them: `resolveTenantId` (UNIFY-04), the shop→tenant sync hook and the tenant
 * editor manifest (UNIFY-05/06), and the `seedTenant` test helper (UNIFY-11).
 *
 * Because the collection is gone, `'tenants'` is no longer a member of the
 * generated `CollectionSlug` union, so a bare literal fails `tsc`. This cast
 * keeps those references compiling without altering their runtime behavior (the
 * value is still the string `'tenants'`). Each consumer — and finally this file
 * — is deleted as the owning task lands its real change.
 */
export const LEGACY_TENANTS_SLUG = 'tenants' as CollectionSlug;
