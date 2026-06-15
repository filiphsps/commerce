import { describe, expect, it } from 'vitest';
import { buildInitialFormState, reduceFieldsToValues } from './state';

describe('buildInitialFormState', () => {
    it('flattens scalars into single leaves seeded clean (value === initialValue)', () => {
        const state = buildInitialFormState({ title: 'Hello', published: true, weight: 3 });
        expect(state).toEqual({
            title: { value: 'Hello', initialValue: 'Hello' },
            published: { value: true, initialValue: true },
            weight: { value: 3, initialValue: 3 },
        });
    });

    it('recurses plain objects into dotted paths', () => {
        const state = buildInitialFormState({ seo: { title: 't', description: 'd' } });
        expect(Object.keys(state).sort()).toEqual(['seo.description', 'seo.title']);
        expect(state['seo.title']?.value).toBe('t');
    });

    it('recurses arrays of objects into indexed row paths (the array widgets derive rows from these)', () => {
        const state = buildInitialFormState({ nav: [{ label: 'a' }, { label: 'b' }] });
        expect(state['nav.0.label']?.value).toBe('a');
        expect(state['nav.1.label']?.value).toBe('b');
        expect(state.nav).toBeUndefined();
    });

    it('flattens {alt,src}/{id,url} content objects into dotted leaves instead of eating them as buckets (G4FIX-02)', () => {
        const state = buildInitialFormState({
            logo: { alt: 'Logo', src: '/logo.png' },
            media: { id: 'media_1', url: '/m/1.png' },
        });
        expect(state['logo.alt']?.value).toBe('Logo');
        expect(state['logo.src']?.value).toBe('/logo.png');
        expect(state.logo).toBeUndefined();
        expect(state['media.id']?.value).toBe('media_1');
        expect(state['media.url']?.value).toBe('/m/1.png');
        expect(state.media).toBeUndefined();
    });

    it('keeps primitive lists (hasMany values) as a single leaf', () => {
        const state = buildInitialFormState({ keywords: ['a', 'b'] });
        expect(state.keywords?.value).toEqual(['a', 'b']);
    });

    it('keeps empty arrays and empty objects as leaves so they round-trip through a save', () => {
        const state = buildInitialFormState({ blocks: [], meta: {} });
        expect(state.blocks?.value).toEqual([]);
        expect(state.meta?.value).toEqual({});
    });

    it('keeps mixed arrays as a single leaf', () => {
        const mixed = ['a', { b: 1 }];
        const state = buildInitialFormState({ mixed });
        expect(state.mixed?.value).toEqual(mixed);
    });

    it('keeps null as a leaf value', () => {
        const state = buildInitialFormState({ image: null });
        expect(state.image).toEqual({ value: null, initialValue: null });
    });

    it('is the inverse of reduceFieldsToValues for a nested document', () => {
        const doc = {
            title: 'Page',
            slug: 'page',
            seo: { title: 't', keywords: ['k1', 'k2'] },
            nav: [
                { label: 'Home', href: '/' },
                { label: 'Shop', href: '/shop/', items: [{ label: 'All' }] },
            ],
            body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] },
        };
        expect(reduceFieldsToValues(buildInitialFormState(doc))).toEqual(doc);
    });
});

describe('sparse-array null-hole round-trip (depth-6 nav regression)', () => {
    it('serializes an index-gapped array densely, with no null hole', () => {
        // A transient build gap — a row at index 1 with no index-0 leaf — makes `setDeep` produce a
        // SPARSE array. Left sparse, `JSON.stringify` writes the hole as an explicit `null`.
        const gapped = { 'items.1.label': { value: 'B', initialValue: 'B' } };
        expect(JSON.parse(JSON.stringify(reduceFieldsToValues(gapped)))).toEqual({ items: [{ label: 'B' }] });
    });

    it('round-trips an index-gapped array without collapsing the surviving row', () => {
        const gapped = { 'items.1.label': { value: 'B', initialValue: 'B' } };
        const rebuilt = buildInitialFormState(JSON.parse(JSON.stringify(reduceFieldsToValues(gapped))));
        // The surviving row rebuilds as an INDEXED leaf, not an opaque `items` leaf that would render
        // zero array rows and drop every nested node below it.
        expect(rebuilt['items.0.label']?.value).toBe('B');
        expect(rebuilt.items).toBeUndefined();
    });

    it('tolerates an already-persisted null array hole instead of collapsing the array', () => {
        // Defense-in-depth: a blob written before the serialize fix can still hold an explicit `null`
        // hole. The read must rebuild the survivors rather than collapse the whole array to one leaf.
        const rebuilt = buildInitialFormState({ items: [null, { label: 'B' }] });
        expect(rebuilt['items.0.label']?.value).toBe('B');
        expect(rebuilt.items).toBeUndefined();
    });

    it('preserves a deep nested array through a sparse JSON round-trip (the depth-6 spine)', () => {
        // Mirrors the header editor: a deep spine where an intermediate level briefly carries only a
        // high index. The whole subtree must survive serialize -> JSON -> rebuild.
        const state = { 'items.0.items.1.items.0.description': { value: 'deep', initialValue: 'deep' } };
        const rebuilt = buildInitialFormState(JSON.parse(JSON.stringify(reduceFieldsToValues(state))));
        expect(rebuilt['items.0.items.0.items.0.description']?.value).toBe('deep');
    });
});
