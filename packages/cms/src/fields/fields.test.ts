import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ArrayFieldDescriptor, FieldDescriptor } from '../descriptors';
import { imageField, linkField, navItemField, seoGroup, topLevelNavItemField } from './index';
import { LINK_KINDS, type LinkKind, type LinkRef } from './link';

/**
 * Resolves the name of a descriptor, or `''` for the unnamed (presentational)
 * collapsible container. Keeps the assertions below terse.
 *
 * @param field - Any field descriptor.
 * @returns The descriptor `name`, or an empty string when it has none.
 */
const nameOf = (field: FieldDescriptor): string => ('name' in field ? field.name : '');

describe('reusable field configs', () => {
    it('seoGroup is a leaf-localized group with title/description/keywords/noindex', () => {
        const cfg = seoGroup();
        expect(cfg.type).toBe('group');
        expect(cfg.name).toBe('seo');
        // The GROUP is never localized (G4FIX-03) — its text leaves are.
        expect('localized' in cfg).toBe(false);
        const names = cfg.fields.map(nameOf);
        expect(names).toEqual(expect.arrayContaining(['title', 'description', 'keywords', 'image', 'noindex']));
        for (const leaf of ['title', 'description', 'keywords']) {
            const field = cfg.fields.find((f) => 'name' in f && f.name === leaf);
            expect(field).toMatchObject({ localized: true });
        }
        for (const leaf of ['image', 'noindex']) {
            const field = cfg.fields.find((f) => 'name' in f && f.name === leaf);
            expect(field && 'localized' in field && field.localized).toBeFalsy();
        }
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
            const names = cfg.fields.map(nameOf);
            expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor', 'items']));
        });

        it('exposes image, description, backgroundColor recursively at depth 2', () => {
            const cfg = navItemField({ depth: 3 });
            const nested = cfg.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            const names = nested.fields.map(nameOf);
            expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor', 'items']));
        });

        it('exposes image, description, backgroundColor at depth 3 (leaf level)', () => {
            const cfg = navItemField({ depth: 3 });
            const level2 = cfg.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            const level3 = level2.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            const names = level3.fields.map(nameOf);
            expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor']));
            expect(names).not.toContain('items');
        });

        it('depth: 1 has no nested items field (recursion termination)', () => {
            const cfg = navItemField({ depth: 1 });
            const names = cfg.fields.map(nameOf);
            expect(names).not.toContain('items');
        });

        it('description is localized at every level', () => {
            const cfg = navItemField({ depth: 3 });
            const findDescription = (arr: ArrayFieldDescriptor): FieldDescriptor =>
                arr.fields.find((f) => 'name' in f && f.name === 'description') as FieldDescriptor;
            const d1 = findDescription(cfg);
            expect('localized' in d1 && d1.localized).toBe(true);
            const l2 = cfg.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            const d2 = findDescription(l2);
            expect('localized' in d2 && d2.localized).toBe(true);
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
            const noindex = cfg.fields.find((f) => 'name' in f && f.name === 'noindex');
            expect(noindex).toMatchObject({ type: 'checkbox', defaultValue: false });
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
        it('localizes the label LEAF by default — never the group (G4FIX-03)', () => {
            const cfg = linkField({ name: 'link' });
            expect('localized' in cfg).toBe(false);
            const label = cfg.fields.find((f) => 'name' in f && f.name === 'label');
            expect(label).toMatchObject({ type: 'text', localized: true });
        });

        it('respects localized: false by leaving the label locale-shared', () => {
            const cfg = linkField({ name: 'link', localized: false });
            expect('localized' in cfg).toBe(false);
            const label = cfg.fields.find((f) => 'name' in f && f.name === 'label');
            expect(label && 'localized' in label && label.localized).toBeFalsy();
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
            const kind = cfg.fields.find((f) => 'name' in f && f.name === 'kind');
            const values = kind && 'options' in kind ? kind.options.map((o) => o.value) : [];
            expect(values).toEqual(
                expect.arrayContaining(['page', 'article', 'product', 'collection', 'external', 'anchor']),
            );
        });

        it('relationships point at the right collections', () => {
            const cfg = linkField({ name: 'link' });
            const targetsByName: Record<string, string> = {};
            for (const f of cfg.fields) {
                if ('name' in f && f.type === 'relationship') {
                    targetsByName[f.name] = f.relationTo;
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
            const cond = url?.admin?.condition;
            expect(cond?.({}, { kind: 'external' })).toBe(true);
            expect(cond?.({}, { kind: 'anchor' })).toBe(true);
            expect(cond?.({}, { kind: 'page' })).toBe(false);
        });

        it('openInNewTab defaults to false', () => {
            const cfg = linkField({ name: 'link' });
            const open = cfg.fields.find((f) => 'name' in f && f.name === 'openInNewTab');
            expect(open).toMatchObject({ type: 'checkbox', defaultValue: false });
        });
    });

    describe('linkField LinkRef union', () => {
        it('LINK_KINDS enumerates every supported destination kind', () => {
            expect([...LINK_KINDS]).toEqual(['page', 'article', 'product', 'collection', 'external', 'anchor']);
        });

        it('LinkKind matches the LINK_KINDS tuple at the type level', () => {
            expectTypeOf<LinkKind>().toEqualTypeOf<(typeof LINK_KINDS)[number]>();
        });

        it('LinkRef discriminates on kind — internal vs external/anchor variants', () => {
            const page: LinkRef = { kind: 'page', page: 'home' };
            const external: LinkRef = { kind: 'external', url: 'https://example.com' };
            const anchor: LinkRef = { kind: 'anchor', url: '#section' };
            const collection: LinkRef = { kind: 'collection', collectionRef: 'sale' };
            expect([page.kind, external.kind, anchor.kind, collection.kind]).toEqual([
                'page',
                'external',
                'anchor',
                'collection',
            ]);
        });

        it('LinkRef.kind is exactly the LinkKind union', () => {
            expectTypeOf<LinkRef['kind']>().toEqualTypeOf<LinkKind>();
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
            const lvl1 = cfg.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            expect(lvl1).toBeDefined();
            const lvl2 = lvl1.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            expect(lvl2).toBeDefined();
            const lvl3 = lvl2.fields.find((f) => 'name' in f && f.name === 'items');
            expect(lvl3).toBeUndefined();
        });

        it('nests exactly to depth 6 and terminates (no 7th level)', () => {
            const cfg = navItemField({ depth: 6 });
            let current: ArrayFieldDescriptor | undefined = cfg;
            let levels = 0;
            while (current) {
                levels += 1;
                const next: FieldDescriptor | undefined = current.fields.find((f) => 'name' in f && f.name === 'items');
                current = next && next.type === 'array' ? next : undefined;
            }
            expect(levels).toBe(6);
        });

        it('depth: 1 has no nested items', () => {
            const cfg = navItemField({ depth: 1 });
            const nested = cfg.fields.find((f) => 'name' in f && f.name === 'items');
            expect(nested).toBeUndefined();
        });

        it('each level includes a link group with a localized label leaf', () => {
            const cfg = navItemField({ depth: 2 });
            const link = cfg.fields.find((f) => 'name' in f && f.name === 'link');
            expect(link).toMatchObject({ type: 'group' });
            const label =
                link && 'fields' in link ? link.fields.find((f) => 'name' in f && f.name === 'label') : undefined;
            expect(label).toMatchObject({ type: 'text', localized: true });
        });
    });

    describe('topLevelNavItemField', () => {
        it('exposes a `variant` select with three options + defaultValue', () => {
            const cfg = topLevelNavItemField({ depth: 3 });
            const variant = cfg.fields.find((f) => 'name' in f && f.name === 'variant');
            expect(variant).toBeDefined();
            expect(variant?.type).toBe('select');
            const values = variant && 'options' in variant ? variant.options.map((o) => o.value) : [];
            expect(variant && 'defaultValue' in variant ? variant.defaultValue : undefined).toBe('editorial-columns');
            expect(values).toEqual(expect.arrayContaining(['editorial-columns', 'compact-list', 'featured-promo']));
        });

        it('exposes link, image, description, backgroundColor at the top level', () => {
            const cfg = topLevelNavItemField({ depth: 3 });
            const names = cfg.fields.map(nameOf);
            expect(names).toEqual(
                expect.arrayContaining(['link', 'variant', 'image', 'description', 'backgroundColor', 'items']),
            );
        });

        it('child items do NOT carry the variant field (recursion uses child-shape)', () => {
            const cfg = topLevelNavItemField({ depth: 3 });
            const children = cfg.fields.find((f) => 'name' in f && f.name === 'items') as ArrayFieldDescriptor;
            const childNames = children.fields.map(nameOf);
            expect(childNames).not.toContain('variant');
            expect(childNames).toEqual(
                expect.arrayContaining(['link', 'image', 'description', 'backgroundColor', 'items']),
            );
        });

        it('depth: 1 produces a top-level with variant but no nested items', () => {
            const cfg = topLevelNavItemField({ depth: 1 });
            const names = cfg.fields.map(nameOf);
            expect(names).toContain('variant');
            expect(names).not.toContain('items');
        });
    });

    it("navItemField (legacy) still produces today's shape with no variant field", () => {
        const cfg = navItemField({ depth: 3 });
        const names = cfg.fields.map(nameOf);
        expect(names).not.toContain('variant');
        expect(names).toEqual(expect.arrayContaining(['link', 'image', 'description', 'backgroundColor', 'items']));
    });
});
