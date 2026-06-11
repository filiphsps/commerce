import { Form, useFormFields, useFormModified } from '@nordcom/commerce-cms/editor/form';
import type { FormState } from '@nordcom/commerce-cms/editor/form';
import type { ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccentRepeater } from '@/components/theme-editor/accent-repeater';
import { render, screen } from '@/utils/test/react';

/** The real `accents[]` element rows from the theme catalog. */
const ACCENT_TOKENS: ThemeTokenMeta[] = [
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accents[].type',
        cssVar: '--color-accent-type',
        valueKind: 'enum',
        payloadType: 'select',
        enumValues: ['primary', 'secondary'],
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accents[].color',
        cssVar: '--color-accent',
        valueKind: 'color',
        payloadType: 'text',
    },
    {
        group: 'colors',
        cluster: 'accents',
        path: 'theme.colors.accents[].foreground',
        cssVar: '--color-accent-foreground',
        valueKind: 'color',
        payloadType: 'text',
    },
];

/** One seeded WCAG-AA accent pair, flattened the way `buildInitialFormState` does. */
const ONE_ROW_STATE: FormState = {
    'theme.colors.accents.0.type': { value: 'primary', initialValue: 'primary' },
    'theme.colors.accents.0.color': { value: '#0a0a0a', initialValue: '#0a0a0a' },
    'theme.colors.accents.0.foreground': { value: '#fafafa', initialValue: '#fafafa' },
};

/**
 * Serializes the whole `theme.colors.accents` subtree plus the dirty flag so
 * assertions see exactly what the save toolbar would serialize.
 *
 * @returns A probe element with the accents slice of form state.
 */
function AccentsProbe() {
    const slice = useFormFields(([fields]) =>
        Object.fromEntries(
            Object.entries(fields)
                .filter(([path]) => path.startsWith('theme.colors.accents'))
                .map(([path, field]) => [path, field.value]),
        ),
    );
    const modified = useFormModified();
    return <output data-testid="probe">{JSON.stringify({ slice, modified })}</output>;
}

/** Parses the probe element back into `{ slice, modified }`. */
function readProbe(): { slice: Record<string, unknown>; modified: boolean } {
    return JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
}

/**
 * Mounts the repeater inside the native `<Form>` with the given seed state.
 *
 * @param initialState - Flattened form-state seed.
 */
function mountRepeater(initialState: FormState) {
    render(
        <Form action={() => undefined} initialState={initialState}>
            <AccentRepeater tokens={ACCENT_TOKENS} />
            <AccentsProbe />
        </Form>,
    );
}

describe('AccentRepeater (native form core)', () => {
    it('renders one row per indexed form-state entry', () => {
        mountRepeater(ONE_ROW_STATE);

        expect(screen.getByText('Accent 1')).toBeDefined();
        expect(screen.queryByText('Accent 2')).toBeNull();
        expect(readProbe().modified).toBe(false);
    });

    it('adds a row by seeding its element leaves into form state', () => {
        mountRepeater(ONE_ROW_STATE);

        fireEvent.click(screen.getByRole('button', { name: /add accent/i }));

        expect(screen.getByText('Accent 2')).toBeDefined();
        const { slice, modified } = readProbe();
        expect(slice['theme.colors.accents.1.type']).toBe('');
        expect(slice['theme.colors.accents.1.color']).toBe('');
        expect(slice['theme.colors.accents.1.foreground']).toBe('');
        expect(modified).toBe(true);
    });

    it('writes a cell edit to its indexed path and flips the dirty flag', () => {
        mountRepeater(ONE_ROW_STATE);

        fireEvent.change(screen.getByLabelText('color', { selector: 'input[type="text"]' }), {
            target: { value: '#c8a36a' },
        });

        const { slice, modified } = readProbe();
        expect(slice['theme.colors.accents.0.color']).toBe('#c8a36a');
        expect(modified).toBe(true);
    });

    it('removes a row and re-homes the surviving rows to compact indices', () => {
        mountRepeater({
            ...ONE_ROW_STATE,
            'theme.colors.accents.1.type': { value: 'secondary', initialValue: 'secondary' },
            'theme.colors.accents.1.color': { value: '#c8a36a', initialValue: '#c8a36a' },
            'theme.colors.accents.1.foreground': { value: '#0a0a0a', initialValue: '#0a0a0a' },
        });

        const removeButtons = screen.getAllByRole('button', { name: 'Remove accent' });
        const firstRemove = removeButtons[0];
        if (!firstRemove) throw new Error('expected a remove button per row');
        fireEvent.click(firstRemove);

        const { slice, modified } = readProbe();
        expect(slice['theme.colors.accents.0.type']).toBe('secondary');
        expect(slice['theme.colors.accents.0.color']).toBe('#c8a36a');
        expect(slice['theme.colors.accents.1.type']).toBeUndefined();
        expect(modified).toBe(true);
    });

    it('removing the last row leaves an explicit empty array so the save clears accents', () => {
        mountRepeater(ONE_ROW_STATE);

        fireEvent.click(screen.getByRole('button', { name: 'Remove accent' }));

        const { slice, modified } = readProbe();
        expect(slice['theme.colors.accents']).toEqual([]);
        expect(slice['theme.colors.accents.0.color']).toBeUndefined();
        expect(modified).toBe(true);
    });
});
