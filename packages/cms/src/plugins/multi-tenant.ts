import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant';
import type { Plugin } from 'payload';
import { globalLikeCollections, tenantScopedCollections } from '../collections';

export const buildMultiTenantPlugin = (): Plugin => {
    const globals: readonly string[] = globalLikeCollections;
    const collectionsConfig = Object.fromEntries(
        tenantScopedCollections.map((slug) => [slug, { isGlobal: globals.includes(slug) }]),
    );
    return multiTenantPlugin({
        tenantsSlug: 'tenants',
        userHasAccessToAllTenants: (user: unknown) => (user as { role?: string } | null)?.role === 'admin',
        collections: collectionsConfig,
    });
};
