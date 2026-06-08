// @vitest-environment happy-dom
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldDescriptor } from '../../../descriptors/types';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { createFieldRegistry, RenderFields } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { registerScalarFieldWidgets } from './index';
import { type RelationshipOption, RelationshipQueryProvider, registerDataBoundFieldWidgets } from './relationship';
import { type UploadAction, UploadActionProvider } from './upload';

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
 * Render a descriptor list through a registry seeded with the data-bound
 * widgets, inside a `<Form>` wrapped by the relationship-query and
 * upload-action seams, alongside the blob probe.
 *
 * @param fields - Descriptors to render.
 * @param initialState - Seed form state.
 * @param seams.query - Relationship option resolver.
 * @param seams.action - Upload action.
 * @returns The render result.
 */
function renderFields(
    fields: FieldDescriptor[],
    initialState: FormState,
    seams: { query?: (relationTo: string) => RelationshipOption[]; action?: UploadAction } = {},
) {
    const registry = registerDataBoundFieldWidgets(registerScalarFieldWidgets(createFieldRegistry()));
    const query = seams.query ?? (() => []);
    const action = seams.action ?? vi.fn<UploadAction>(async () => ({ id: 'media_x' }));
    const tree: ReactNode = (
        <RelationshipQueryProvider query={query}>
            <UploadActionProvider action={action}>
                <Form action={vi.fn()} initialState={initialState}>
                    <RenderFields registry={registry} fields={fields} parentPath="" />
                    <Blob />
                </Form>
            </UploadActionProvider>
        </RelationshipQueryProvider>
    );
    return render(tree);
}

describe('relationship widget', () => {
    const options: RelationshipOption[] = [
        { id: 'doc_a', label: 'Doc A' },
        { id: 'doc_b', label: 'Doc B' },
    ];

    it('lists options from the query seam and writes the selected id', () => {
        const query = vi.fn(() => options);
        const { getByTestId, container } = renderFields(
            [{ type: 'relationship', name: 'page', label: 'Page', relationTo: 'pages' }],
            { page: clean(undefined) },
            { query },
        );

        expect(query).toHaveBeenCalledWith('pages');
        const select = controlOf(getByTestId('field-page'), 'select') as HTMLSelectElement;
        expect(Array.from(select.options, (option) => option.value)).toEqual(['', 'doc_a', 'doc_b']);

        fireEvent.change(select, { target: { value: 'doc_b' } });
        expect(blob(container)).toEqual({ page: 'doc_b' });
    });

    it('writes an ordered id array for hasMany', () => {
        const { getByTestId, container } = renderFields(
            [{ type: 'relationship', name: 'pages', relationTo: 'pages', hasMany: true }],
            { pages: clean([]) },
            { query: () => options },
        );

        const select = controlOf(getByTestId('field-pages'), 'select') as HTMLSelectElement;
        const optionB = select.options[1];
        if (!optionB) throw new TypeError('missing option');
        optionB.selected = true;
        fireEvent.change(select);
        expect(blob(container)).toEqual({ pages: ['doc_b'] });
    });

    it('prunes a condition-hidden relationship from the _payload blob', () => {
        const fields: FieldDescriptor[] = [
            { type: 'text', name: 'kind' },
            {
                type: 'relationship',
                name: 'page',
                relationTo: 'pages',
                admin: { condition: (_data, sibling) => sibling.kind === 'linked' },
            },
        ];
        const { queryByTestId, getByTestId, container } = renderFields(
            fields,
            { kind: clean('plain'), page: clean('doc_a') },
            { query: () => options },
        );

        expect(queryByTestId('field-page')).toBeNull();
        expect(blob(container)).toEqual({ kind: 'plain' });

        fireEvent.change(controlOf(getByTestId('field-kind'), 'input') as HTMLInputElement, {
            target: { value: 'linked' },
        });
        expect(queryByTestId('field-page')).not.toBeNull();
        expect(blob(container)).toEqual({ kind: 'linked', page: 'doc_a' });
    });
});

describe('upload widget', () => {
    it('calls the upload action and stores the returned media id', async () => {
        const action = vi.fn<UploadAction>(async () => ({ id: 'media_42' }));
        const { getByTestId, container } = renderFields(
            [{ type: 'upload', name: 'hero', label: 'Hero', relationTo: 'media' }],
            { hero: clean(undefined) },
            { action },
        );

        const input = controlOf(getByTestId('field-hero'), 'input[type="file"]') as HTMLInputElement;
        const file = new File(['x'], 'hero.png', { type: 'image/png' });
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => expect(action).toHaveBeenCalledWith(file));
        await waitFor(() => expect(blob(container)).toEqual({ hero: 'media_42' }));
    });

    it('surfaces a failed upload inline without clobbering a stored id', async () => {
        const action = vi.fn<UploadAction>(async () => {
            throw new TypeError('boom');
        });
        const { getByTestId, container } = renderFields(
            [{ type: 'upload', name: 'hero', relationTo: 'media' }],
            { hero: clean('media_old') },
            { action },
        );

        const input = controlOf(getByTestId('field-hero'), 'input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [new File(['x'], 'hero.png')] } });

        await waitFor(() => expect(controlOf(getByTestId('field-hero'), '[role="alert"]').textContent).toBe('boom'));
        expect(blob(container)).toEqual({ hero: 'media_old' });
    });

    it('prunes a condition-hidden upload from the _payload blob', () => {
        const fields: FieldDescriptor[] = [
            { type: 'checkbox', name: 'withImage' },
            {
                type: 'upload',
                name: 'hero',
                relationTo: 'media',
                admin: { condition: (_data, sibling) => sibling.withImage === true },
            },
        ];
        const { queryByTestId, container } = renderFields(fields, {
            withImage: clean(false),
            hero: clean('media_old'),
        });

        expect(queryByTestId('field-hero')).toBeNull();
        expect(blob(container)).toEqual({ withImage: false });
    });
});

describe('data-bound registry dispatch', () => {
    it('registers a renderer for relationship and upload', () => {
        const registry = registerDataBoundFieldWidgets(createFieldRegistry());
        expect(registry.get('relationship')).toBeTypeOf('function');
        expect(registry.get('upload')).toBeTypeOf('function');
    });
});
