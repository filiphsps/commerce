import type { Payload } from 'payload';

export type SeedTenantInput = {
    payload: Payload;
    name: string;
    slug: string;
    defaultLocale?: string;
    locales?: string[];
};

export async function seedTenant(_input: SeedTenantInput): Promise<{ id: string }> {
    throw new Error('seedTenant: tenants collection not yet defined — implemented in Task 5');
}
