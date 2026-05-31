import { describe, expect, it } from 'vitest';

import { formReducer } from './reducer';
import { isFieldDirty, isFormModified, reduceFieldsToValues } from './state';
import type { FormState } from './types';

/**
 * Build a clean field entry — `value` equal to `initialValue`, so the field
 * reads as non-dirty.
 */
function clean(value: unknown): { value: unknown; initialValue: unknown; valid: boolean } {
    return { value, initialValue: value, valid: true };
}

describe('formReducer', () => {
    describe('UPDATE', () => {
        it('sets the value at a dotted path while preserving its initialValue', () => {
            const state: FormState = { 'seo.title': clean('Home') };
            const next = formReducer(state, { type: 'UPDATE', path: 'seo.title', value: 'About' });
            expect(next['seo.title']?.value).toBe('About');
            expect(next['seo.title']?.initialValue).toBe('Home');
        });

        it('creates a previously-absent path', () => {
            const next = formReducer({}, { type: 'UPDATE', path: 'nav.items.0.label', value: 'Shop' });
            expect(next['nav.items.0.label']?.value).toBe('Shop');
        });

        it('does not mutate the previous state object', () => {
            const state: FormState = { title: clean('A') };
            formReducer(state, { type: 'UPDATE', path: 'title', value: 'B' });
            expect(state.title?.value).toBe('A');
        });

        it('carries an explicit validity + error message', () => {
            const next = formReducer(
                {},
                { type: 'UPDATE', path: 'seo.title', value: '', valid: false, errorMessage: 'Required' },
            );
            expect(next['seo.title']?.valid).toBe(false);
            expect(next['seo.title']?.errorMessage).toBe('Required');
        });
    });

    describe('REMOVE', () => {
        it('deletes the field at a path', () => {
            const state: FormState = { a: clean(1), b: clean(2) };
            const next = formReducer(state, { type: 'REMOVE', path: 'a' });
            expect(next.a).toBeUndefined();
            expect(next.b?.value).toBe(2);
        });
    });

    describe('REPLACE_STATE — InitialStateGate merge', () => {
        it('takes server values for clean fields', () => {
            const current: FormState = { 'seo.title': clean('Old') };
            const server: FormState = { 'seo.title': clean('Server') };
            const next = formReducer(current, { type: 'REPLACE_STATE', state: server });
            expect(next['seo.title']?.value).toBe('Server');
        });

        it('KEEPS an in-flight dirty field — server state must NOT clobber a keystroke', () => {
            // The user typed "Draft" into seo.title (value diverged from its
            // initialValue "Old"); a fresh server build then arrives with
            // "Server". The gate must keep the user's in-flight "Draft".
            const current: FormState = { 'seo.title': { value: 'Draft', initialValue: 'Old', valid: true } };
            const server: FormState = { 'seo.title': clean('Server') };
            const next = formReducer(current, { type: 'REPLACE_STATE', state: server });
            expect(next['seo.title']?.value).toBe('Draft');
        });

        it('merges per-field: dirty fields keep user values, clean siblings take server values', () => {
            const current: FormState = {
                'seo.title': { value: 'Draft', initialValue: 'Old', valid: true },
                'seo.description': clean('Desc'),
            };
            const server: FormState = {
                'seo.title': clean('Server title'),
                'seo.description': clean('Server desc'),
            };
            const next = formReducer(current, { type: 'REPLACE_STATE', state: server });
            expect(next['seo.title']?.value).toBe('Draft');
            expect(next['seo.description']?.value).toBe('Server desc');
        });

        it('adopts server-added fields not present in the current state', () => {
            const current: FormState = { a: clean(1) };
            const server: FormState = { a: clean(1), b: clean(2) };
            const next = formReducer(current, { type: 'REPLACE_STATE', state: server });
            expect(next.b?.value).toBe(2);
        });
    });
});

describe('isFieldDirty', () => {
    it('is false when value equals initialValue', () => {
        expect(isFieldDirty({ value: 'x', initialValue: 'x' })).toBe(false);
    });

    it('is true when value diverges from initialValue', () => {
        expect(isFieldDirty({ value: 'y', initialValue: 'x' })).toBe(true);
    });

    it('compares arrays/objects structurally', () => {
        expect(isFieldDirty({ value: [1, 2], initialValue: [1, 2] })).toBe(false);
        expect(isFieldDirty({ value: { a: 1 }, initialValue: { a: 2 } })).toBe(true);
    });
});

describe('isFormModified', () => {
    it('is false for an all-clean state', () => {
        expect(isFormModified({ a: clean(1), b: clean('x') })).toBe(false);
    });

    it('is true when any field is dirty', () => {
        expect(isFormModified({ a: clean(1), b: { value: 'z', initialValue: 'x' } })).toBe(true);
    });
});

describe('reduceFieldsToValues', () => {
    it('unflattens dotted paths into a nested object', () => {
        const state: FormState = {
            'seo.title': clean('Home'),
            'seo.description': clean('Welcome'),
        };
        expect(reduceFieldsToValues(state)).toEqual({ seo: { title: 'Home', description: 'Welcome' } });
    });

    it('unflattens numeric segments into arrays', () => {
        const state: FormState = {
            'nav.0.label': clean('Shop'),
            'nav.1.label': clean('Blog'),
        };
        expect(reduceFieldsToValues(state)).toEqual({ nav: [{ label: 'Shop' }, { label: 'Blog' }] });
    });

    it('skips fields flagged disableFormData', () => {
        const state: FormState = {
            title: clean('A'),
            nav: { value: undefined, initialValue: undefined, disableFormData: true },
        };
        expect(reduceFieldsToValues(state)).toEqual({ title: 'A' });
    });
});
