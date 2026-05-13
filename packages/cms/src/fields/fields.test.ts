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
});
