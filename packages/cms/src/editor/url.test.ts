import type { Route } from 'next';
import { describe, expect, it } from 'vitest';
import { LEGACY_TENANTS_SLUG } from '../legacy-tenants-slug';
import { defineCollectionEditor } from './manifest';
import { docUrlSegment } from './url';

const scoped = defineCollectionEditor({
    collection: 'pages',
    routes: { label: { singular: 'Page', plural: 'Pages' }, basePath: (d) => `/${d}/pages/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

const singletonByDomain = defineCollectionEditor({
    collection: 'shops',
    routes: { label: { singular: 'Shop', plural: 'Shops' }, basePath: (d) => `/${d}/settings/shop/` as Route },
    tenant: { kind: 'singleton-by-domain' },
    access: { list: () => false, read: () => true, update: () => true },
});

const tenantSingleton = defineCollectionEditor({
    collection: 'footer',
    routes: { label: { singular: 'Footer', plural: 'Footer' }, basePath: (d) => `/${d}/content/footer/` as Route },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

const shared = defineCollectionEditor({
    collection: LEGACY_TENANTS_SLUG,
    routes: { label: { singular: 'Tenant', plural: 'Tenants' }, basePath: () => `/settings/tenants/` as Route },
    tenant: { kind: 'shared', readableBy: 'admin' },
    access: { list: () => true, read: () => true, update: () => true },
});

describe('docUrlSegment', () => {
    it('returns the id with trailing slash for scoped manifests with a real id', () => {
        expect(docUrlSegment(scoped, '507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011/');
    });

    it('returns empty string for the singleton sentinel under a scoped manifest', () => {
        expect(docUrlSegment(scoped, 'singleton')).toBe('');
    });

    it('returns empty string for singleton-by-domain manifests regardless of id', () => {
        expect(docUrlSegment(singletonByDomain, 'demo.nordcom.store')).toBe('');
    });

    it('returns the id with trailing slash for shared manifests', () => {
        expect(docUrlSegment(shared, 'tenant-1')).toBe('tenant-1/');
    });

    it('preserves the id verbatim (no encoding) — caller is responsible for URL-safety', () => {
        expect(docUrlSegment(scoped, 'has spaces')).toBe('has spaces/');
    });

    it('returns empty string for tenant-singleton manifests regardless of id', () => {
        expect(docUrlSegment(tenantSingleton, '')).toBe('');
        expect(docUrlSegment(tenantSingleton, 'anything')).toBe('');
    });
});
