// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldDescriptor } from '../../../descriptors/types';
import { arrayField, collapsibleField, groupField, localized, textareaField, textField } from '../../../descriptors';
import { topLevelNavItemField } from '../../../fields';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { createFieldRegistry, RenderFields } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { registerCompositeFieldWidgets, registerScalarFieldWidgets } from './index';

const clean = (value: unknown): FormState[string] => ({ value, initialValue: value, valid: true });

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
 * Render a descriptor list through a registry seeded with both the scalar and
 * composite widgets, inside a `<Form>` carrying `initialState`, alongside the
 * blob probe.
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

describe('group field widget', () => {
    it('renders nested children at dotted paths under the group key', () => {
        const { getByTestId, container } = renderFields(
            [groupField({ name: 'seo', label: 'SEO', fields: [textField({ name: 'title' })] })],
            { 'seo.title': clean('Home') },
        );
        const input = controlOf(getByTestId('field-seo.title'), 'input') as HTMLInputElement;
        expect(input.value).toBe('Home');
        fireEvent.change(input, { target: { value: 'About' } });
        expect(blob(container)).toEqual({ seo: { title: 'About' } });
    });
});

describe('collapsible field widget', () => {
    it('groups children at the parent scope without a data key and toggles open/closed', () => {
        const { getByTestId, container } = renderFields(
            [collapsibleField({ label: 'Advanced', fields: [textField({ name: 'slug' })] })],
            { slug: clean('home') },
        );

        const toggle = controlOf(getByTestId('collapsible-Advanced'), 'button');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        // No `Advanced` key — the collapsible is presentational, so the child
        // still serializes at the top level even while collapsed.
        fireEvent.change(controlOf(getByTestId('field-slug'), 'input') as HTMLInputElement, {
            target: { value: 'home-page' },
        });
        expect(blob(container)).toEqual({ slug: 'home-page' });
    });
});

describe('array field widget', () => {
    const arrayFields: FieldDescriptor[] = [
        arrayField({
            name: 'items',
            fields: [textField({ name: 'label' }), localized(textareaField({ name: 'description' }))],
        }),
    ];

    const seedTwoRows: FormState = {
        'items.0.label': clean('A'),
        'items.0.description': clean({ en: 'A-en', sv: 'A-sv' }),
        'items.1.label': clean('B'),
        'items.1.description': clean({ en: 'B-en', sv: 'B-sv' }),
    };

    it('reorder preserves stable row identity and localized bucket values', () => {
        const { getByTestId, container } = renderFields(arrayFields, seedTwoRows);

        const before = container.querySelectorAll('[data-testid="array-row-items"]');
        const idA = before[0]?.getAttribute('data-row-id');
        const idB = before[1]?.getAttribute('data-row-id');
        expect(idA).toBeTruthy();
        expect(idB).toBeTruthy();
        expect(idA).not.toBe(idB);
        expect((blob(container) as { items: unknown[] }).items).toEqual([
            { label: 'A', description: { en: 'A-en', sv: 'A-sv' } },
            { label: 'B', description: { en: 'B-en', sv: 'B-sv' } },
        ]);

        fireEvent.click(getByTestId('array-move-down-items-0'));

        const after = container.querySelectorAll('[data-testid="array-row-items"]');
        // The row that was second (id idB) now sits first, carrying its content.
        expect(after[0]?.getAttribute('data-row-id')).toBe(idB);
        expect(after[1]?.getAttribute('data-row-id')).toBe(idA);
        expect((blob(container) as { items: unknown[] }).items).toEqual([
            { label: 'B', description: { en: 'B-en', sv: 'B-sv' } },
            { label: 'A', description: { en: 'A-en', sv: 'A-sv' } },
        ]);
    });

    it('remove drops the targeted row and shifts the survivors down, identity intact', () => {
        const { getByTestId, container } = renderFields(arrayFields, seedTwoRows);
        const before = container.querySelectorAll('[data-testid="array-row-items"]');
        const idB = before[1]?.getAttribute('data-row-id');

        fireEvent.click(getByTestId('array-remove-items-0'));

        const after = container.querySelectorAll('[data-testid="array-row-items"]');
        expect(after).toHaveLength(1);
        expect(after[0]?.getAttribute('data-row-id')).toBe(idB);
        expect((blob(container) as { items: unknown[] }).items).toEqual([
            { label: 'B', description: { en: 'B-en', sv: 'B-sv' } },
        ]);
    });

    it('add appends an editable row whose edits land at the new index', () => {
        const { getByTestId, container } = renderFields(arrayFields, seedTwoRows);
        fireEvent.click(getByTestId('array-add-items'));

        expect(container.querySelectorAll('[data-testid="array-row-items"]')).toHaveLength(3);

        fireEvent.change(controlOf(getByTestId('field-items.2.label'), 'input') as HTMLInputElement, {
            target: { value: 'C' },
        });
        expect((blob(container) as { items: unknown[] }).items).toEqual([
            { label: 'A', description: { en: 'A-en', sv: 'A-sv' } },
            { label: 'B', description: { en: 'B-en', sv: 'B-sv' } },
            { label: 'C' },
        ]);
    });
});

describe('recursive depth-6 nav tree', () => {
    // Six `items.0` segments: the top-level header array nests `buildChildItems`
    // five levels deep, the deepest level (remaining === 1) holding no further
    // `items` array. Seeding one deep leaf cascades a single row at every level
    // because each array derives its rows from the indexed paths beneath it.
    const deepBackgroundColor = 'items.0.items.0.items.0.items.0.items.0.items.0.backgroundColor';
    const deepDescription = 'items.0.items.0.items.0.items.0.items.0.items.0.description';

    /**
     * Walk six `items[0]` levels into a reconstructed nav blob.
     *
     * @param data - The serialized blob.
     * @returns The deepest nav row object.
     */
    function deepestRow(data: Record<string, unknown>): Record<string, unknown> {
        let node: Record<string, unknown> = data;
        for (let level = 0; level < 6; level++) {
            const items = node.items as Record<string, unknown>[] | undefined;
            const row = items?.[0];
            if (!row) throw new TypeError(`missing nav row at level ${level}`);
            node = row;
        }
        return node;
    }

    it('renders depth-6 array-of-arrays and lands a deepest-leaf edit at its dotted path without sibling clobber', () => {
        const { getByTestId, container } = renderFields([topLevelNavItemField({ depth: 6 })], {
            [deepBackgroundColor]: clean(''),
            [deepDescription]: clean('keep-me'),
        });

        // The per-item variant select rides on the top-level header row.
        expect(controlOf(getByTestId('field-items.0.variant'), 'select') as HTMLSelectElement).toBeTruthy();

        const input = controlOf(getByTestId(`field-${deepBackgroundColor}`), 'input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'deep-value' } });

        const row = deepestRow(blob(container));
        expect(row.backgroundColor).toBe('deep-value');
        // Sibling at the same deepest level is untouched by the edit.
        expect(row.description).toBe('keep-me');
    });
});
