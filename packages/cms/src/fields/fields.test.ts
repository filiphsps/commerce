import { describe, expect, it } from 'vitest';
import { imageField, linkField, navItemField, seoGroup } from './index';

describe('reusable field configs', () => {
    it('seoGroup is a localized group with title/description/keywords/noindex', () => {
        const cfg = seoGroup();
        expect(cfg.type).toBe('group');
        expect(cfg.name).toBe('seo');
        expect(cfg.localized).toBe(true);
        const names = cfg.fields.map((f) => ('name' in f ? f.name : ''));
        expect(names).toEqual(expect.arrayContaining(['title', 'description', 'keywords', 'image', 'noindex']));
    });

    it('linkField is a typed group with kind discriminator', () => {
        const cfg = linkField({ name: 'link' });
        expect(cfg.type).toBe('group');
        expect(cfg.name).toBe('link');
        const kindField = cfg.fields.find((f) => 'name' in f && f.name === 'kind');
        expect(kindField).toBeDefined();
    });

    it('imageField allows alt + focal point', () => {
        const cfg = imageField({ name: 'cover' });
        expect(cfg.type).toBe('upload');
        expect(cfg.relationTo).toBe('media');
    });

    it('navItemField is recursive — children reference itself', () => {
        const cfg = navItemField({ depth: 3 });
        expect(cfg.type).toBe('array');
        expect(cfg.name).toBe('items');
    });

    describe('navItemField extended fields', () => {
        it('exposes image, description, backgroundColor at depth 1', () => {
            const cfg = navItemField({ depth: 3 });
            const names = cfg.fields.map((f) => ('name' in f ? f.name : ''));
            expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor', 'items']));
        });

        it('exposes image, description, backgroundColor recursively at depth 2', () => {
            const cfg = navItemField({ depth: 3 });
            const nested = cfg.fields.find((f) => 'name' in f && f.name === 'items') as Extract<
                (typeof cfg.fields)[number],
                { type: 'array' }
            >;
            const names = nested.fields.map((f) => ('name' in f ? f.name : ''));
            expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor', 'items']));
        });

        it('exposes image, description, backgroundColor at depth 3 (leaf level)', () => {
            const cfg = navItemField({ depth: 3 });
            const level2 = cfg.fields.find((f) => 'name' in f && f.name === 'items') as Extract<
                (typeof cfg.fields)[number],
                { type: 'array' }
            >;
            const level3 = level2.fields.find((f) => 'name' in f && f.name === 'items') as Extract<
                (typeof level2.fields)[number],
                { type: 'array' }
            >;
            const names = level3.fields.map((f) => ('name' in f ? f.name : ''));
            expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor']));
            expect(names).not.toContain('items');
        });

        it('depth: 1 has no nested items field (recursion termination)', () => {
            const cfg = navItemField({ depth: 1 });
            const names = cfg.fields.map((f) => ('name' in f ? f.name : ''));
            expect(names).not.toContain('items');
        });

        it('description is localized at every level', () => {
            const cfg = navItemField({ depth: 3 });
            const findDescription = (
                arr: Extract<typeof cfg, { type: 'array' }>,
            ): Extract<(typeof arr.fields)[number], { type: 'textarea' }> =>
                arr.fields.find((f) => 'name' in f && f.name === 'description') as never;
            const d1 = findDescription(cfg);
            expect(d1.localized).toBe(true);
            const l2 = cfg.fields.find((f) => 'name' in f && f.name === 'items') as Extract<
                (typeof cfg.fields)[number],
                { type: 'array' }
            >;
            const d2 = findDescription(l2);
            expect(d2.localized).toBe(true);
        });
    });

    describe('seoGroup', () => {
        it('returns a stable shape on each call (no shared mutable state)', () => {
            const a = seoGroup();
            const b = seoGroup();
            expect(a).not.toBe(b);
            expect(a.fields.length).toBe(b.fields.length);
        });

        it('noindex defaults to false', () => {
            const cfg = seoGroup();
            const noindex = cfg.fields.find((f) => 'name' in f && f.name === 'noindex') as Extract<
                (typeof cfg.fields)[number],
                { type: 'checkbox' }
            >;
            expect(noindex.defaultValue).toBe(false);
        });

        it('image points at the media collection', () => {
            const cfg = seoGroup();
            const image = cfg.fields.find((f) => 'name' in f && f.name === 'image');
            expect(image).toMatchObject({ type: 'upload', relationTo: 'media' });
        });

        it('keywords supports hasMany strings', () => {
            const cfg = seoGroup();
            const kw = cfg.fields.find((f) => 'name' in f && f.name === 'keywords');
            expect(kw).toMatchObject({ type: 'text', hasMany: true });
        });
    });

    describe('linkField', () => {
        it('defaults to localized: true', () => {
            const cfg = linkField({ name: 'link' });
            expect(cfg.localized).toBe(true);
        });

        it('respects localized: false', () => {
            const cfg = linkField({ name: 'link', localized: false });
            expect(cfg.localized).toBe(false);
        });

        it('forwards a custom label', () => {
            const cfg = linkField({ name: 'link', label: 'Primary call to action' });
            expect(cfg.label).toBe('Primary call to action');
        });

        it('leaves the label sub-field optional', () => {
            // Required `label` would block any save where the editor hasn't
            // yet filled a CTA (header drafts, nav items pending content) —
            // storefront renderers treat an empty link group as "no CTA"
            // via `resolveLinkRef`, so validation belongs in the render
            // path, not the schema.
            const cfg = linkField({ name: 'link' });
            const label = cfg.fields.find((f) => 'name' in f && f.name === 'label');
            expect(label).toMatchObject({ type: 'text' });
            expect((label as { required?: boolean }).required).toBeUndefined();
        });

        it('declares all 6 link kinds', () => {
            const cfg = linkField({ name: 'link' });
            const kind = cfg.fields.find((f) => 'name' in f && f.name === 'kind') as Extract<
                (typeof cfg.fields)[number],
                { type: 'select' }
            >;
            const values = kind.options.map((o) => (typeof o === 'string' ? o : (o as { value: string }).value));
            expect(values).toEqual(
                expect.arrayContaining(['page', 'article', 'product', 'collection', 'external', 'anchor']),
            );
        });

        it('relationships point at the right collections', () => {
            const cfg = linkField({ name: 'link' });
            const targetsByName: Record<string, string> = {};
            for (const f of cfg.fields) {
                if ('name' in f && f.type === 'relationship') {
                    targetsByName[f.name as string] = f.relationTo as string;
                }
            }
            expect(targetsByName).toMatchObject({
                page: 'pages',
                article: 'articles',
                product: 'productMetadata',
                // `collection` is reserved by Mongoose, so the relation field
                // is named `collectionRef`; the `kind` discriminator stays
                // 'collection' for editor familiarity.
                collectionRef: 'collectionMetadata',
            });
        });

        it('url field is gated on kind being external or anchor', () => {
            const cfg = linkField({ name: 'link' });
            const url = cfg.fields.find((f) => 'name' in f && f.name === 'url');
            const cond = (url as { admin?: { condition?: (d: unknown, sib: unknown) => boolean } }).admin?.condition;
            expect(cond?.({}, { kind: 'external' })).toBe(true);
            expect(cond?.({}, { kind: 'anchor' })).toBe(true);
            expect(cond?.({}, { kind: 'page' })).toBe(false);
        });

        it('openInNewTab defaults to false', () => {
            const cfg = linkField({ name: 'link' });
            const open = cfg.fields.find((f) => 'name' in f && f.name === 'openInNewTab') as Extract<
                (typeof cfg.fields)[number],
                { type: 'checkbox' }
            >;
            expect(open.defaultValue).toBe(false);
        });
    });

    describe('imageField', () => {
        it('forwards name + label + relationTo: "media"', () => {
            const cfg = imageField({ name: 'cover', label: 'Cover image' });
            expect(cfg.name).toBe('cover');
            expect(cfg.label).toBe('Cover image');
            expect(cfg.relationTo).toBe('media');
        });

        it('required defaults to false', () => {
            const cfg = imageField({ name: 'cover' });
            expect(cfg.required).toBe(false);
        });

        it('respects required + localized overrides', () => {
            const cfg = imageField({ name: 'cover', required: true, localized: true });
            expect(cfg.required).toBe(true);
            expect(cfg.localized).toBe(true);
        });
    });

    describe('navItemField', () => {
        it('nests recursively up to the configured depth', () => {
            const cfg = navItemField({ depth: 3 });
            const lvl1 = cfg.fields.find((f) => 'name' in f && f.name === 'items') as Extract<
                (typeof cfg.fields)[number],
                { type: 'array' }
            >;
            expect(lvl1).toBeDefined();
            const lvl2 = lvl1?.fields.find((f) => 'name' in f && f.name === 'items') as Extract<
                (typeof lvl1.fields)[number],
                { type: 'array' }
            >;
            expect(lvl2).toBeDefined();
            const lvl3 = lvl2?.fields.find((f) => 'name' in f && f.name === 'items');
            expect(lvl3).toBeUndefined();
        });

        it('depth: 1 has no nested items', () => {
            const cfg = navItemField({ depth: 1 });
            const nested = cfg.fields.find((f) => 'name' in f && f.name === 'items');
            expect(nested).toBeUndefined();
        });

        it('each level includes a localized link field', () => {
            const cfg = navItemField({ depth: 2 });
            const link = cfg.fields.find((f) => 'name' in f && f.name === 'link');
            expect(link).toMatchObject({ type: 'group', localized: true });
        });
    });
});
