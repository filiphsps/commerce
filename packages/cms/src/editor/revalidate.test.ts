import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import {
    cmsTenantRootTags as rootTagsFromDescriptor,
    cmsCacheSchema as schemaFromDescriptor,
} from '../cache-descriptor';
import { defineCollectionEditor } from './manifest';
import { cmsCacheSchema, cmsTenantRootTags, refreshEditorPaths } from './revalidate';

const scopedManifest = defineCollectionEditor({
    collection: 'footer',
    routes: { label: { singular: 'X', plural: 'X' }, basePath: () => '/' as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

describe('bridge contract re-export', () => {
    it('re-exports the exact cache-descriptor objects — one tag vocabulary, no copy', () => {
        expect(cmsCacheSchema).toBe(schemaFromDescriptor);
        expect(cmsTenantRootTags).toBe(rootTagsFromDescriptor);
    });
});

describe('refreshEditorPaths', () => {
    it('calls revalidatePath once per manifest-declared admin path', () => {
        const revalidatePath = vi.fn();
        const manifest = defineCollectionEditor({
            ...scopedManifest,
            revalidate: ({ domain }) => [`/${domain}/content/footer/`, `/${domain}/`],
        });
        refreshEditorPaths({ manifest, domain: 'a.test', doc: {}, status: 'published', revalidatePath });
        expect(revalidatePath).toHaveBeenCalledTimes(2);
        expect(revalidatePath).toHaveBeenNthCalledWith(1, '/a.test/content/footer/');
        expect(revalidatePath).toHaveBeenNthCalledWith(2, '/a.test/');
    });

    it('no-ops when manifest.revalidate is undefined', () => {
        const revalidatePath = vi.fn();
        refreshEditorPaths({ manifest: scopedManifest, domain: 'a.test', doc: {}, status: 'draft', revalidatePath });
        expect(revalidatePath).not.toHaveBeenCalled();
    });
});
