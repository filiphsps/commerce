import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { collectionMetadata } from './collection-metadata';
import { productMetadata } from './product-metadata';

// Pure config introspection. Cross-tenant uniqueness of (tenant, shopifyHandle)
// is exercised end-to-end in `access/multi-tenant-isolation.test.ts`.
describe.each([
    ['productMetadata', productMetadata],
    ['collectionMetadata', collectionMetadata],
] as const)('%s collection', (name, collection) => {
    const fields = (collection.fields ?? []) as Field[];
    const byName = (n: string) => fields.find((f): f is Field & { name: string } => 'name' in f && f.name === n);

    it(`has slug "${name}"`, () => {
        expect(collection.slug).toBe(name);
    });

    it('requires shopifyHandle and indexes it', () => {
        expect(byName('shopifyHandle')).toMatchObject({ required: true, index: true });
    });

    it('enforces (tenant, shopifyHandle) uniqueness via compound index', () => {
        expect(collection.indexes).toContainEqual({ fields: ['tenant', 'shopifyHandle'], unique: true });
    });

    it('opts in to drafts with autosave', () => {
        expect(collection.versions).toMatchObject({ drafts: { autosave: { interval: 2000 } } });
    });
});
