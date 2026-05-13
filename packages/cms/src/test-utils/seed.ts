import type { Payload } from 'payload';

export type SeedTenantInput = {
    payload: Payload;
    name: string;
    slug: string;
    defaultLocale?: string;
    locales?: string[];
};

export async function seedTenant({
    payload,
    name,
    slug,
    defaultLocale = 'en-US',
    locales = ['en-US'],
}: SeedTenantInput): Promise<{ id: string }> {
    const tenant = await payload.create({
        collection: 'tenants',
        data: { name, slug, defaultLocale, locales },
    });
    return { id: String(tenant.id) };
}
