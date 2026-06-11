import type { CollectionSlug } from './editor/manifest';

/**
 * The dedicated `tenants` collection was deleted in UNIFY-03 — tenancy keys on
 * `shops` (shop == tenant, keyed on the shop row id). The slug survives only
 * as an editor-route alias: the tenants manifest's routes render an empty
 * surface, the same fallback an unregistered collection produces. Delete this
 * with the tenants manifest once those routes retire.
 */
export const LEGACY_TENANTS_SLUG: CollectionSlug = 'tenants';
