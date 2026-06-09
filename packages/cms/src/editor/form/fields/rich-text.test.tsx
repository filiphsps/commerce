// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { FieldDescriptor } from '../../../descriptors/types';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { createFieldRegistry, RenderFields } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { registerScalarFieldWidgets } from './index';
import {
    EMPTY_PROSE_MIRROR_DOC,
    type RichTextEditorComponent,
    RichTextEditorProvider,
    registerRichTextFieldWidget,
} from './rich-text';

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
 * A stand-in for the host's Tiptap editor: a button that commits a fixed ProseMirror document so a
 * test can assert the widget persists what the editor reports through the localized bucket.
 *
 * @param props - The editor props the widget passes down.
 * @returns A button whose label is the current document and whose click edits it.
 */
const MockEditor: RichTextEditorComponent = ({ id, value, onChange }) => (
    <button
        type="button"
        data-testid={`${id}-editor`}
        onClick={() => onChange({ type: 'doc', content: [{ type: 'paragraph' }] })}
    >
        {JSON.stringify(value)}
    </button>
);

/**
 * Render a descriptor list through a registry seeded with the scalar + rich-text widgets, inside a
 * `<Form>`, optionally wrapped by the editor seam, alongside the blob probe.
 *
 * @param fields - Descriptors to render.
 * @param initialState - Seed form state.
 * @param editor - Optional injected editor; omitted exercises the JSON fallback.
 * @returns The render result.
 */
function renderFields(fields: FieldDescriptor[], initialState: FormState, editor?: RichTextEditorComponent) {
    const registry = registerRichTextFieldWidget(registerScalarFieldWidgets(createFieldRegistry()));
    const form: ReactNode = (
        <Form action={() => {}} initialState={initialState}>
            <RenderFields registry={registry} fields={fields} parentPath="" />
            <Blob />
        </Form>
    );
    const tree = editor ? <RichTextEditorProvider editor={editor}>{form}</RichTextEditorProvider> : form;
    return render(tree);
}

describe('rich-text widget', () => {
    it('registers a renderer for the json descriptor kind', () => {
        const registry = registerRichTextFieldWidget(createFieldRegistry());
        expect(registry.get('json')).toBeTypeOf('function');
    });

    it('persists the injected editor edits as ProseMirror JSON in the bucket', () => {
        const { getByTestId, container } = renderFields(
            [{ type: 'json', name: 'body', label: 'Body' }],
            { body: clean(undefined) },
            MockEditor,
        );

        fireEvent.click(getByTestId('body-editor'));
        expect(blob(container)).toEqual({ body: { type: 'doc', content: [{ type: 'paragraph' }] } });
    });

    it('falls back to a JSON editor that persists ProseMirror JSON', () => {
        const { getByTestId, container } = renderFields([{ type: 'json', name: 'body', label: 'Body' }], {
            body: clean(undefined),
        });

        const textarea = controlOf(getByTestId('field-body'), 'textarea') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '{"type":"doc","content":[]}' } });
        expect(blob(container)).toEqual({ body: EMPTY_PROSE_MIRROR_DOC });
    });

    it('surfaces invalid JSON inline without clobbering the bucket', () => {
        const { getByTestId, container } = renderFields([{ type: 'json', name: 'body' }], {
            body: clean({ type: 'doc', content: [] }),
        });

        const textarea = controlOf(getByTestId('field-body'), 'textarea') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '{ not json' } });
        expect(controlOf(getByTestId('field-body'), '[role="alert"]')).toBeTruthy();
        expect(blob(container)).toEqual({ body: { type: 'doc', content: [] } });
    });

    it('mounts the collapsible conditional siblings on the checkbox', () => {
        const fields: FieldDescriptor[] = [
            { type: 'json', name: 'body', label: 'Body' },
            { type: 'checkbox', name: 'collapsible' },
            {
                type: 'checkbox',
                name: 'collapsedByDefault',
                admin: { condition: (_data, sibling) => sibling.collapsible === true },
            },
            {
                type: 'text',
                name: 'collapseLabel',
                admin: { condition: (_data, sibling) => sibling.collapsible === true },
            },
        ];
        const { getByTestId, queryByTestId } = renderFields(fields, {
            body: clean(undefined),
            collapsible: clean(false),
            collapsedByDefault: clean(false),
            collapseLabel: clean(''),
        });

        expect(queryByTestId('field-collapsedByDefault')).toBeNull();
        expect(queryByTestId('field-collapseLabel')).toBeNull();

        fireEvent.click(controlOf(getByTestId('field-collapsible'), 'input[type="checkbox"]'));

        expect(queryByTestId('field-collapsedByDefault')).not.toBeNull();
        expect(queryByTestId('field-collapseLabel')).not.toBeNull();
    });
});
