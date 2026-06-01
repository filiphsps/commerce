// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BLOCK_TYPES, allBlockDescriptors } from '../../../blocks/registry';
import { blocksField } from '../../../descriptors';
import type { BlocksFieldDescriptor } from '../../../descriptors/types';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { RenderFields, createFieldRegistry } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { registerCompositeFieldWidgets, registerScalarFieldWidgets } from './index';

/**
 * Probe serializing live form state into the nested `_payload`-equivalent blob.
 *
 * @returns A span carrying the JSON-serialized form values.
 */
function Blob() {
    const data = useFormFields(([fields]) => reduceFieldsToValues(fields));
    return <span data-testid="blob">{JSON.stringify(data)}</span>;
}

/**
 * Read the parsed blob the {@link Blob} probe rendered.
 *
 * @param container - The render result root.
 * @returns The parsed blob object.
 */
function blob(container: HTMLElement): Record<string, unknown> {
    const node = container.querySelector('[data-testid="blob"]');
    return JSON.parse(node?.textContent ?? '{}') as Record<string, unknown>;
}

/**
 * Find a control inside a field shell, throwing when absent.
 *
 * @param shell - The field shell element.
 * @param selector - A CSS selector for the control.
 * @returns The matched control element.
 * @throws {TypeError} When no element matches the selector.
 */
function controlOf(shell: HTMLElement, selector: string): HTMLElement {
    const found = shell.querySelector(selector);
    if (!found) throw new TypeError(`no \`${selector}\` control in field shell`);
    return found as HTMLElement;
}

/**
 * Render a single blocks descriptor through a registry seeded with the scalar
 * and composite (incl. blocks) widgets, inside a `<Form>` carrying
 * `initialState`, alongside the blob probe.
 *
 * @param field - The blocks descriptor to render.
 * @param initialState - Seed form state.
 * @returns The render result.
 */
function renderBlocks(field: BlocksFieldDescriptor, initialState: FormState) {
    const registry = registerCompositeFieldWidgets(registerScalarFieldWidgets(createFieldRegistry()));
    return render(
        <Form action={vi.fn()} initialState={initialState}>
            <RenderFields registry={registry} fields={[field]} parentPath="" />
            <Blob />
        </Form>,
    );
}

describe('blocks field widget', () => {
    it('wires every BLOCK_TYPES member to a descriptor whose slug matches', () => {
        for (const type of BLOCK_TYPES) {
            const descriptor = allBlockDescriptors.find((block) => block.slug === type);
            expect(descriptor?.slug).toBe(type);
        }
    });

    it('adds each of the 9 block types, edits a nested columns field, and round-trips the payload', () => {
        const field = blocksField({ name: 'content', blocks: allBlockDescriptors });
        const { getByTestId, container } = renderBlocks(field, {});

        const picker = getByTestId('blocks-picker-content') as HTMLSelectElement;
        for (const type of BLOCK_TYPES) {
            fireEvent.change(picker, { target: { value: type } });
            fireEvent.click(getByTestId('blocks-add-content'));
        }

        expect(container.querySelectorAll('[data-testid="blocks-row-content"]')).toHaveLength(BLOCK_TYPES.length);

        // Each row reconstructs into a block object carrying its discriminant, in
        // canonical BLOCK_TYPES order (columns first).
        const added = (blob(container).content as Array<{ blockType: string }>).map((b) => b.blockType);
        expect(added).toEqual([...BLOCK_TYPES]);

        // Edit a field nested two levels inside the columns block (its `columns`
        // array auto-shows one row at minRows=1) and assert it round-trips.
        const width = controlOf(getByTestId('field-content.0.columns.0.width'), 'select') as HTMLSelectElement;
        fireEvent.change(width, { target: { value: '1/2' } });

        const columnsRow = (blob(container).content as Array<Record<string, unknown>>)[0];
        expect(columnsRow?.blockType).toBe('columns');
        expect(columnsRow?.columns).toEqual([{ width: '1/2' }]);
    });

    it('renders an unknown block type as an inert no-op row without throwing', () => {
        const field = blocksField({ name: 'content', blocks: allBlockDescriptors });
        const { container, getByTestId } = renderBlocks(field, {
            'content.0.blockType': { value: 'mystery', initialValue: 'mystery', valid: true },
        });

        // The unknown row mounts a no-op placeholder rather than dispatching to a
        // missing descriptor, and never crashes the editor.
        expect(() => getByTestId('blocks-unknown-content-0')).not.toThrow();
        expect(container.querySelectorAll('[data-testid="blocks-row-content"]')).toHaveLength(1);

        // The forward-compatible blockType still serializes for a later renderer.
        expect((blob(container).content as Array<{ blockType: string }>)[0]?.blockType).toBe('mystery');
    });
});
