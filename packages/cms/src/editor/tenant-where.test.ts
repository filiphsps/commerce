import type { Route } from 'next';
import { describe, expect, it } from 'vitest';
import { LEGACY_TENANTS_SLUG } from '../legacy-tenants-slug';
import { defineCollectionEditor } from './manifest';
import { tenantWhere } from './tenant-where';

const TENANT = { id: 'tenant-1', slug: 'acme' };

const scopedManifest = defineCollectionEditor({
    collection: 'businessData',
    routes: { label: { singular: 'X', plural: 'X' }, basePath: () => '/' as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

const singletonManifest = defineCollectionEditor({
    collection: 'businessData',
    routes: { label: { singular: 'Shop', plural: 'Shops' }, basePath: () => '/' as Route, keyField: 'domain' },
    tenant: { kind: 'singleton-by-domain' },
    access: { list: () => true, read: () => true, update: () => true },
});

const sharedManifest = defineCollectionEditor({
    collection: LEGACY_TENANTS_SLUG,
    routes: { label: { singular: 'Tenant', plural: 'Tenants' }, basePath: () => '/' as Route },
    tenant: { kind: 'shared', readableBy: 'admin' },
    access: { list: () => true, read: () => true, update: () => true },
});

const tenantSingletonManifest = defineCollectionEditor({
    collection: 'footer',
    routes: { label: { singular: 'Footer', plural: 'Footer' }, basePath: () => '/' as Route },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

describe('tenantWhere', () => {
    it('scoped: ANDs tenant + key', () => {
        expect(tenantWhere(scopedManifest, TENANT, 'doc-1')).toEqual({
            and: [{ tenant: { equals: 'tenant-1' } }, { id: { equals: 'doc-1' } }],
        });
    });

    it('scoped: uses manifest.routes.keyField when set', () => {
        const m = defineCollectionEditor({
            ...scopedManifest,
            routes: { ...scopedManifest.routes, keyField: 'shopifyHandle' },
        });
        expect(tenantWhere(m, TENANT, 'snowboard')).toEqual({
            and: [{ tenant: { equals: 'tenant-1' } }, { shopifyHandle: { equals: 'snowboard' } }],
        });
    });

    it('singleton-by-domain: ORs domain + alternativeDomains contains', () => {
        expect(tenantWhere(singletonManifest, null, 'a.test')).toEqual({
            or: [{ domain: { equals: 'a.test' } }, { alternativeDomains: { contains: 'a.test' } }],
        });
    });

    it('shared: ignores tenant; equals on keyField', () => {
        expect(tenantWhere(sharedManifest, null, 'doc-1')).toEqual({ id: { equals: 'doc-1' } });
    });

    it('tenant-singleton: filters by tenant only, ignoring the keyField and id', () => {
        expect(tenantWhere(tenantSingletonManifest, TENANT, 'whatever')).toEqual({
            tenant: { equals: 'tenant-1' },
        });
    });

    it('tenant-singleton: throws MissingTenantForScopedCollectionError when tenant is null', () => {
        expect(() => tenantWhere(tenantSingletonManifest, null, 'whatever')).toThrow(
            expect.objectContaining({ name: 'MissingTenantForScopedCollectionError' }),
        );
    });
});
