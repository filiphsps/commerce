import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant';
import type { Plugin } from 'payload';
import { globalLikeCollections, tenantScopedCollections } from '../collections';

/**
 * Constructs the `@payloadcms/plugin-multi-tenant` instance wired to this
 * platform's collection layout. Global-like collections (header, footer,
 * businessData) are registered as `isGlobal: true` so the plugin creates
 * one doc per tenant instead of an unbounded list.
 *
 * @returns A configured Payload plugin.
 *
 * @example
 * buildPayloadConfig({ plugins: [buildMultiTenantPlugin(), ...] });
 */
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
