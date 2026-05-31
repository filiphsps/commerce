import type { Payload } from 'payload';
import { LEGACY_TENANTS_SLUG } from '../legacy-tenants-slug';

/**
 * Input for {@link seedTenant}.
 *
 * @example
 * seedTenant({ payload, name: 'Test Shop', slug: 'test-shop' });
 */
export type SeedTenantInput = {
    payload: Payload;
    name: string;
    slug: string;
    defaultLocale?: string;
    locales?: string[];
};

/**
 * Creates a tenant document in the test Payload instance. Used by integration
 * tests that need at least one tenant before exercising tenant-scoped
 * collections.
 *
 * @param input - {@link SeedTenantInput} with the Payload instance and tenant fields.
 * @returns The new tenant's `id` as a string.
 * @example
 * ```ts
 * const { id } = await seedTenant({
 *   payload,
 *   name: 'Acme Store',
 *   slug: 'acme-store',
 *   defaultLocale: 'en-US',
 *   locales: ['en-US', 'sv-SE'],
 * });
 * ```
 */
export async function seedTenant({
    payload,
    name,
    slug,
    defaultLocale = 'en-US',
    locales = ['en-US'],
}: SeedTenantInput): Promise<{ id: string }> {
    const tenant = await payload.create({
        collection: LEGACY_TENANTS_SLUG,
        // `as never`: the deleted `tenants` collection has no generated data type
        // (see legacy-tenants-slug.ts). UNIFY-11 re-seeds against `shops`.
        data: { name, slug, defaultLocale, locales } as never,
    });
    return { id: String(tenant.id) };
}
