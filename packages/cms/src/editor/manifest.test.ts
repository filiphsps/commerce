import type { Route } from 'next';
import { describe, expect, it } from 'vitest';
import { defineCollectionEditor } from './manifest';

describe('defineCollectionEditor', () => {
    it('returns the manifest unchanged (identity helper)', () => {
        const manifest = defineCollectionEditor({
            collection: 'footer',
            routes: {
                label: { singular: 'Footer', plural: 'Footer' },
                basePath: (d) => `/${d}/content/footer/` as Route,
            },
            tenant: { kind: 'scoped', field: 'tenant' },
            access: {
                list: () => true,
                read: () => true,
                update: () => true,
            },
        });
        expect(manifest.collection).toBe('footer');
        expect(manifest.tenant.kind).toBe('scoped');
        expect(manifest.access.read({ user: null, domain: null })).toBe(true);
    });

    it('preserves optional fields (livePreview, revalidate, list)', () => {
        const manifest = defineCollectionEditor({
            collection: 'pages',
            routes: {
                label: { singular: 'Page', plural: 'Pages' },
                basePath: (d) => `/${d}/content/pages/` as Route,
            },
            tenant: { kind: 'scoped', field: 'tenant' },
            access: { list: () => true, read: () => true, update: () => true },
            list: { columns: [{ label: 'Title', accessor: 'title' }], bulkActions: ['delete'] },
            livePreview: () => 'https://preview.test/',
            revalidate: ({ domain }) => [`/${domain}/content/pages/`],
        });
        expect(manifest.list?.bulkActions).toEqual(['delete']);
        expect(manifest.livePreview?.({ tenantId: 't', collection: 'pages', data: {}, locale: 'en' })).toBe(
            'https://preview.test/',
        );
        expect(manifest.revalidate?.({ domain: 'a.test', doc: {}, status: 'published' })).toEqual([
            '/a.test/content/pages/',
        ]);
    });
});
