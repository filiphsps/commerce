import { describe, expect, it } from 'vitest';
import { selectField } from './builders';
import { collapseOverridable, OVERRIDE_INHERIT, overridable } from './overridable';

describe('overridable()', () => {
    it('wraps a scalar field as an overridable descriptor', () => {
        const field = overridable(
            selectField({
                name: 'ctaPlacement',
                label: 'CTA placement',
                options: [{ label: 'Float', value: 'float-pill' }],
            }),
            { inheritedSourceLabel: 'Platform default' },
        );
        expect(field.type).toBe('overridable');
        expect(field.name).toBe('ctaPlacement');
        expect(field.label).toBe('CTA placement');
        expect(field.field.type).toBe('select');
        expect(field.inheritedSourceLabel).toBe('Platform default');
    });

    it('exposes the canonical inherit sentinel', () => {
        expect(OVERRIDE_INHERIT).toEqual({ __mode: 'inherit' });
    });
});

describe('collapseOverridable()', () => {
    it('returns undefined when inheriting or absent', () => {
        expect(collapseOverridable(undefined)).toBeUndefined();
        expect(collapseOverridable({ __mode: 'inherit' })).toBeUndefined();
    });

    it('returns the wrapped value when overriding', () => {
        expect(collapseOverridable({ __mode: 'override', value: 'inline-button' })).toBe('inline-button');
    });
});
