import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { pages } from './pages';

// Pure config introspection. We trust Payload to enforce required-field
// validation and localization — its own test suite covers that. The valuable
// end-to-end behaviors (multi-tenant slug uniqueness, access predicates) are
// covered by `access/multi-tenant-isolation.test.ts`.
describe('pages collection', () => {
    const fields = (pages.fields ?? []) as Field[];
    const byName = (name: string) => fields.find((f): f is Field & { name: string } => 'name' in f && f.name === name);

    it('has slug "pages" and draft versions with autosave', () => {
        expect(pages.slug).toBe('pages');
        expect(pages.versions).toMatchObject({ drafts: { autosave: { interval: 2000 } } });
    });

    it('requires title and slug', () => {
        expect(byName('title')).toMatchObject({ required: true });
        expect(byName('slug')).toMatchObject({ required: true });
    });

    it('localizes title (per-locale storage)', () => {
        expect(byName('title')).toMatchObject({ localized: true });
    });

    it('enforces (tenant, slug) uniqueness via compound index', () => {
        expect(pages.indexes).toContainEqual({ fields: ['tenant', 'slug'], unique: true });
    });
});
