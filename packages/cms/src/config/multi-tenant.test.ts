import { describe, expect, it, vi } from 'vitest';
import { globalLikeCollections, tenantScopedCollections } from '../collections';

// `@payloadcms/plugin-multi-tenant` is library code — its tenant partitioning
// behavior is its own test suite's job. What we pin here is OUR wiring: every
// tenant-scoped collection is enrolled, the globals are flagged `isGlobal`, and
// the admin-bypass predicate has the right shape. Mock the plugin factory so
// we can read the args our wrapper passes in without booting Payload.
const captured = vi.hoisted(() => ({ args: undefined as unknown }));

vi.mock('@payloadcms/plugin-multi-tenant', () => ({
    multiTenantPlugin: vi.fn((opts: unknown) => {
        captured.args = opts;
        // The Payload runtime expects a callable plugin; the body is irrelevant here.
        return () => undefined;
    }),
}));

describe('buildMultiTenantPlugin', () => {
    // Import lazily so the vi.mock above is in place first.
    const buildAndCapture = async () => {
        const { buildMultiTenantPlugin } = await import('../plugins');
        buildMultiTenantPlugin();
        return captured.args as {
            tenantsSlug: string;
            collections: Record<string, { isGlobal?: boolean }>;
            userHasAccessToAllTenants: (user: unknown) => boolean;
        };
    };

    it('routes to the `shops` collection for tenant resolution (shop == tenant, keyed on the shop row id)', async () => {
        const args = await buildAndCapture();
        expect(args.tenantsSlug).toBe('shops');
    });

    it('enrolls every tenant-scoped collection (matches the source-of-truth list)', async () => {
        const args = await buildAndCapture();
        expect(new Set(Object.keys(args.collections))).toEqual(new Set(tenantScopedCollections));
    });

    it('flags `header` / `footer` / `businessData` as isGlobal so the plugin treats them as per-tenant singletons', async () => {
        const args = await buildAndCapture();
        for (const slug of globalLikeCollections) {
            expect(args.collections[slug]?.isGlobal).toBe(true);
        }
    });

    it('non-global tenant collections (pages, articles, …) are NOT flagged isGlobal', async () => {
        const args = await buildAndCapture();
        const nonGlobal = tenantScopedCollections.filter(
            (slug) => !(globalLikeCollections as readonly string[]).includes(slug),
        );
        for (const slug of nonGlobal) {
            expect(args.collections[slug]?.isGlobal).toBeFalsy();
        }
    });

    it('grants admins access to ALL tenants via userHasAccessToAllTenants', async () => {
        const args = await buildAndCapture();
        expect(args.userHasAccessToAllTenants({ role: 'admin' })).toBe(true);
        expect(args.userHasAccessToAllTenants({ role: 'editor' })).toBe(false);
        expect(args.userHasAccessToAllTenants(null)).toBe(false);
        // The role check is the boundary — a role-less user must NOT bypass.
        expect(args.userHasAccessToAllTenants({})).toBe(false);
    });
});
