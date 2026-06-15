import { describe, expect, it } from 'vitest';
import { selectField } from './builders';
import { overridable } from './overridable';

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

    it('derives its name from the wrapped field when no label is given', () => {
        const field = overridable(selectField({ name: 'layout', options: [{ label: 'V', value: 'vertical' }] }));
        expect(field.name).toBe('layout');
        expect(field.inheritedSourceLabel).toBeUndefined();
    });
});
