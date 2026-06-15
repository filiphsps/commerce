// @vitest-environment happy-dom
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { responsiveField, selectField } from '../../../descriptors';
import type { FieldDescriptor } from '../../../descriptors/types';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { createFieldRegistry, RenderFields } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { registerCompositeFieldWidgets, registerScalarFieldWidgets } from './index';

const clean = (value: unknown): FormState[string] => ({ value, initialValue: value, valid: true });

const layoutField = responsiveField({
    name: 'layout',
    label: 'Layout',
    field: selectField({
        name: 'layout',
        options: [
            { label: 'Grid', value: 'grid' },
            { label: 'Carousel', value: 'carousel' },
        ],
    }),
    defaultValue: { base: 'carousel', md: 'grid' },
});

/**
 * Probe serializing the live form state into a JSON blob for assertions.
 *
 * @returns A span carrying the JSON-serialized form values.
 */
function Blob() {
    const data = useFormFields(([fields]) => reduceFieldsToValues(fields));
    return <span data-testid="blob">{JSON.stringify(data)}</span>;
}

const readBlob = (container: HTMLElement): Record<string, unknown> =>
    JSON.parse(container.querySelector('[data-testid="blob"]')?.textContent ?? '{}');

/**
 * Render descriptors through a registry seeded with the scalar + composite (incl.
 * responsive) widgets inside a `<Form>`.
 *
 * @param fields - Descriptors to render.
 * @param initialState - Seed form state.
 * @returns The render result.
 */
function renderFields(fields: FieldDescriptor[], initialState: FormState) {
    const registry = registerCompositeFieldWidgets(registerScalarFieldWidgets(createFieldRegistry()));
    return render(
        <Form action={vi.fn()} initialState={initialState}>
            <RenderFields registry={registry} fields={fields} parentPath="" />
            <Blob />
        </Form>,
    );
}

describe('responsive field widget', () => {
    it('always renders the base row labeled with its device name and no remove control', () => {
        const { getByTestId, queryByTestId } = renderFields([layoutField], { 'layout.base': clean('carousel') });
        const base = getByTestId('responsive-row-layout-base');
        expect(within(base).getByText('Mobile')).toBeTruthy();
        expect((within(base).getByLabelText('Mobile') as HTMLSelectElement).value).toBe('carousel');
        expect(queryByTestId('responsive-remove-layout-base')).toBeNull();
    });

    it('renders a row per active breakpoint with the human device label', () => {
        const { getByTestId } = renderFields([layoutField], {
            'layout.base': clean('carousel'),
            'layout.md': clean('grid'),
        });
        expect(within(getByTestId('responsive-row-layout-base')).getByText('Mobile')).toBeTruthy();
        const tablet = getByTestId('responsive-row-layout-md');
        expect(within(tablet).getByText('Tablet')).toBeTruthy();
        expect((within(tablet).getByLabelText('Tablet') as HTMLSelectElement).value).toBe('grid');
    });

    it('adds a breakpoint via the device dropdown, seeded from the value below it', () => {
        const { getByTestId, container } = renderFields([layoutField], { 'layout.base': clean('carousel') });
        fireEvent.change(getByTestId('responsive-add-layout'), { target: { value: 'lg' } });
        expect(getByTestId('responsive-row-layout-lg')).toBeTruthy();
        // Seeded from the nearest defined value below (base → carousel).
        expect(readBlob(container).layout).toMatchObject({ base: 'carousel', lg: 'carousel' });
    });

    it('omits already-active breakpoints from the add dropdown', () => {
        const { getByTestId } = renderFields([layoutField], {
            'layout.base': clean('carousel'),
            'layout.md': clean('grid'),
        });
        const options = within(getByTestId('responsive-add-layout'))
            .getAllByRole('option')
            .map((option) => (option as HTMLOptionElement).value);
        expect(options).not.toContain('md');
        expect(options).toContain('lg');
    });

    it('removes a non-base breakpoint and drops its value', () => {
        const { getByTestId, queryByTestId, container } = renderFields([layoutField], {
            'layout.base': clean('carousel'),
            'layout.md': clean('grid'),
        });
        fireEvent.click(getByTestId('responsive-remove-layout-md'));
        expect(queryByTestId('responsive-row-layout-md')).toBeNull();
        expect(readBlob(container).layout).toEqual({ base: 'carousel' });
    });
});
