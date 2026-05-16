import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { defineCollectionEditor } from './manifest';
import { revalidateForManifest, tenantWhere } from './revalidate';

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
    collection: 'tenants',
    routes: { label: { singular: 'Tenant', plural: 'Tenants' }, basePath: () => '/' as Route },
    tenant: { kind: 'shared', readableBy: 'admin' },
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
});

describe('revalidateForManifest', () => {
    it('calls revalidatePath once per returned path', () => {
        const revalidatePath = vi.fn();
        const manifest = defineCollectionEditor({
            ...scopedManifest,
            revalidate: ({ domain }) => [`/${domain}/content/business-data/`, `/${domain}/`],
        });
        revalidateForManifest({ manifest, domain: 'a.test', doc: {}, status: 'published', revalidatePath });
        expect(revalidatePath).toHaveBeenCalledTimes(2);
        expect(revalidatePath).toHaveBeenNthCalledWith(1, '/a.test/content/business-data/');
        expect(revalidatePath).toHaveBeenNthCalledWith(2, '/a.test/');
    });

    it('no-ops when manifest.revalidate is undefined', () => {
        const revalidatePath = vi.fn();
        revalidateForManifest({ manifest: scopedManifest, domain: 'a.test', doc: {}, status: 'draft', revalidatePath });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
