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

    describe('seoGroup', () => {
        it('returns a stable shape on each call (no shared mutable state)', () => {
            const a = seoGroup();
            const b = seoGroup();
            expect(a).not.toBe(b);
            expect(a.fields.length).toBe(b.fields.length);
        });

        it('noindex defaults to false', () => {
            const cfg = seoGroup();
            const noindex = cfg.fields.find(
                (f) => 'name' in f && f.name === 'noindex',
            ) as Extract<(typeof cfg.fields)[number], { type: 'checkbox' }>;
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

        it('requires the label sub-field', () => {
            const cfg = linkField({ name: 'link' });
            const label = cfg.fields.find((f) => 'name' in f && f.name === 'label');
            expect(label).toMatchObject({ type: 'text', required: true });
        });

        it('declares all 6 link kinds', () => {
            const cfg = linkField({ name: 'link' });
            const kind = cfg.fields.find((f) => 'name' in f && f.name === 'kind') as Extract<
                (typeof cfg.fields)[number],
                { type: 'select' }
            >;
            const values = kind.options.map((o) =>
                typeof o === 'string' ? o : (o as { value: string }).value,
            );
            expect(values).toEqual(
                expect.arrayContaining([
                    'page',
                    'article',
                    'product',
                    'collection',
                    'external',
                    'anchor',
                ]),
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
                collection: 'collectionMetadata',
            });
        });

        it('url field is gated on kind being external or anchor', () => {
            const cfg = linkField({ name: 'link' });
            const url = cfg.fields.find((f) => 'name' in f && f.name === 'url');
            const cond = (url as { admin?: { condition?: (d: unknown, sib: unknown) => boolean } })
                .admin?.condition;
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
            const lvl1 = cfg.fields.find(
                (f) => 'name' in f && f.name === 'items',
            ) as Extract<(typeof cfg.fields)[number], { type: 'array' }>;
            expect(lvl1).toBeDefined();
            const lvl2 = lvl1?.fields.find(
                (f) => 'name' in f && f.name === 'items',
            ) as Extract<(typeof lvl1.fields)[number], { type: 'array' }>;
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
