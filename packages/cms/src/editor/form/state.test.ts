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
