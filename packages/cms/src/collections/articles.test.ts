import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { articles } from './articles';

// Pure config introspection. (tenant, slug) uniqueness is exercised end-to-end
// in `access/multi-tenant-isolation.test.ts` — booting Payload here just to
// hit the same code paths is ~5–10s of overhead for no extra signal.
describe('articles collection', () => {
    const fields = (articles.fields ?? []) as Field[];
    const byName = (name: string) => fields.find((f): f is Field & { name: string } => 'name' in f && f.name === name);

    it('has slug "articles" and draft versions with autosave', () => {
        expect(articles.slug).toBe('articles');
        expect(articles.versions).toMatchObject({ drafts: { autosave: { interval: 2000 } } });
    });

    it('requires title, slug, and author', () => {
        for (const name of ['title', 'slug', 'author']) {
            expect(byName(name)).toMatchObject({ required: true });
        }
    });

    it('localizes title, excerpt, and body', () => {
        for (const name of ['title', 'excerpt', 'body']) {
            expect(byName(name)).toMatchObject({ localized: true });
        }
    });

    it('enforces (tenant, slug) uniqueness via compound index', () => {
        expect(articles.indexes).toContainEqual({ fields: ['tenant', 'slug'], unique: true });
    });
});
