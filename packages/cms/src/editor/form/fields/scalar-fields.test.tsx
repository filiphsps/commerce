// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldDescriptor, FieldDescriptorKind } from '../../../descriptors/types';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { createFieldRegistry, RenderFields } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { registerScalarFieldWidgets } from './index';

const clean = (value: unknown): FormState[string] => ({ value, initialValue: value, valid: true });

/**
 * Probe that serializes the live form state into the `_payload`-equivalent
 * nested blob, so tests can assert what each widget wrote through form state.
 */
function Blob() {
    const data = useFormFields(([fields]) => reduceFieldsToValues(fields));
    return <span data-testid="blob">{JSON.stringify(data)}</span>;
}

/**
 * Read the parsed `_payload` blob the {@link Blob} probe rendered.
 *
 * @param container - The render result root.
 * @returns The parsed blob object.
 */
function blob(container: HTMLElement): Record<string, unknown> {
    const node = container.querySelector('[data-testid="blob"]');
    return JSON.parse(node?.textContent ?? '{}') as Record<string, unknown>;
}

/**
 * Find a control inside a field shell, throwing when it is absent so tests fail
 * loudly rather than dereferencing `null`.
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
 * Render a descriptor list through a registry seeded with the scalar widgets,
 * inside a `<Form>` carrying `initialState`, alongside the blob probe.
 *
 * @param fields - Descriptors to render.
 * @param initialState - Seed form state.
 * @returns The render result.
 */
function renderFields(fields: FieldDescriptor[], initialState: FormState) {
    const registry = registerScalarFieldWidgets(createFieldRegistry());
    return render(
        <Form action={vi.fn()} initialState={initialState}>
            <RenderFields registry={registry} fields={fields} parentPath="" />
            <Blob />
        </Form>,
    );
}

describe('scalar leaf field widgets', () => {
    it('text: renders the value and writes edits through form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'text', name: 'title', label: 'Title' }], {
            title: clean('Home'),
        });
        const input = controlOf(getByTestId('field-title'), 'input[type="text"]') as HTMLInputElement;
        expect(input.value).toBe('Home');
        fireEvent.change(input, { target: { value: 'About' } });
        expect(blob(container)).toEqual({ title: 'About' });
    });

    it('textarea: writes edits through form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'textarea', name: 'body' }], { body: clean('hello') });
        const input = controlOf(getByTestId('field-body'), 'textarea') as HTMLTextAreaElement;
        expect(input.value).toBe('hello');
        fireEvent.change(input, { target: { value: 'world' } });
        expect(blob(container)).toEqual({ body: 'world' });
    });

    it('select: round-trips a chosen option through form state', () => {
        const { getByTestId, container } = renderFields(
            [
                {
                    type: 'select',
                    name: 'kind',
                    options: [
                        { label: 'A', value: 'a' },
                        { label: 'B', value: 'b' },
                    ],
                },
            ],
            { kind: clean('a') },
        );
        const select = controlOf(getByTestId('field-kind'), 'select') as HTMLSelectElement;
        expect(select.value).toBe('a');
        fireEvent.change(select, { target: { value: 'b' } });
        expect(blob(container)).toEqual({ kind: 'b' });
    });

    it('checkbox: round-trips a boolean through form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'checkbox', name: 'enabled' }], {
            enabled: clean(false),
        });
        const checkbox = controlOf(getByTestId('field-enabled'), 'input[type="checkbox"]') as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
        fireEvent.click(checkbox);
        expect(blob(container)).toEqual({ enabled: true });
    });

    it('number: parses input into a number in form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'number', name: 'count' }], { count: clean(1) });
        const input = controlOf(getByTestId('field-count'), 'input[type="number"]') as HTMLInputElement;
        expect(input.value).toBe('1');
        fireEvent.change(input, { target: { value: '42' } });
        expect(blob(container)).toEqual({ count: 42 });
    });

    it('date: writes the picked date through form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'date', name: 'publishedAt' }], {
            publishedAt: clean('2026-01-01'),
        });
        const input = controlOf(getByTestId('field-publishedAt'), 'input[type="date"]') as HTMLInputElement;
        expect(input.value).toBe('2026-01-01');
        fireEvent.change(input, { target: { value: '2026-02-02' } });
        expect(blob(container)).toEqual({ publishedAt: '2026-02-02' });
    });

    it('email: writes edits through form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'email', name: 'contact' }], {
            contact: clean('a@b.com'),
        });
        const input = controlOf(getByTestId('field-contact'), 'input[type="email"]') as HTMLInputElement;
        expect(input.value).toBe('a@b.com');
        fireEvent.change(input, { target: { value: 'c@d.com' } });
        expect(blob(container)).toEqual({ contact: 'c@d.com' });
    });

    it('json: round-trips a parsed object through form state', () => {
        const { getByTestId, container } = renderFields([{ type: 'json', name: 'meta' }], { meta: clean({ a: 1 }) });
        const textarea = controlOf(getByTestId('field-meta'), 'textarea') as HTMLTextAreaElement;
        expect(textarea.value).toContain('"a": 1');
        fireEvent.change(textarea, { target: { value: '{"a":2}' } });
        expect(blob(container)).toEqual({ meta: { a: 2 } });
    });

    it('json: holds an invalid buffer as an inline error without corrupting state', () => {
        const { getByTestId, container } = renderFields([{ type: 'json', name: 'meta' }], { meta: clean({ a: 1 }) });
        const textarea = controlOf(getByTestId('field-meta'), 'textarea') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: '{ not json' } });
        expect(controlOf(getByTestId('field-meta'), '[role="alert"]').textContent).toBeTruthy();
        expect(blob(container)).toEqual({ meta: { a: 1 } });
    });

    it('code: writes edits through form state and exposes the language hint', () => {
        const { getByTestId, container } = renderFields([{ type: 'code', name: 'snippet', language: 'html' }], {
            snippet: clean('<p>hi</p>'),
        });
        const textarea = controlOf(getByTestId('field-snippet'), 'textarea') as HTMLTextAreaElement;
        expect(textarea.value).toBe('<p>hi</p>');
        expect(textarea.getAttribute('data-language')).toBe('html');
        fireEvent.change(textarea, { target: { value: '<b>x</b>' } });
        expect(blob(container)).toEqual({ snippet: '<b>x</b>' });
    });

    it('renders the required marker and sets the native required attribute', () => {
        const { getByTestId } = renderFields([{ type: 'text', name: 'title', label: 'Title', required: true }], {
            title: clean(''),
        });
        const shell = getByTestId('field-title');
        expect(controlOf(shell, 'span[aria-hidden="true"]').textContent).toBe('*');
        expect((controlOf(shell, 'input') as HTMLInputElement).required).toBe(true);
    });

    it('surfaces a validation message present in form state', () => {
        const { getByTestId } = renderFields([{ type: 'text', name: 'title', label: 'Title' }], {
            title: { value: 'x', initialValue: 'x', valid: false, errorMessage: 'Required.' },
        });
        expect(controlOf(getByTestId('field-title'), '[role="alert"]').textContent).toBe('Required.');
    });
});

describe('descriptor condition', () => {
    const fields: FieldDescriptor[] = [
        { type: 'text', name: 'kind', label: 'Kind' },
        {
            type: 'text',
            name: 'externalUrl',
            label: 'External URL',
            admin: { condition: (_data, sibling) => sibling.kind === 'external' },
        },
    ];

    it('excludes a condition-hidden widget from render and the _payload blob', () => {
        const { queryByTestId, container } = renderFields(fields, {
            kind: clean('internal'),
            externalUrl: clean('https://x.test'),
        });
        expect(queryByTestId('field-externalUrl')).toBeNull();
        expect(blob(container)).toEqual({ kind: 'internal' });
    });

    it('restores the hidden widget and its value when the condition flips visible', () => {
        const { getByTestId, queryByTestId, container } = renderFields(fields, {
            kind: clean('internal'),
            externalUrl: clean('https://x.test'),
        });
        expect(queryByTestId('field-externalUrl')).toBeNull();

        fireEvent.change(controlOf(getByTestId('field-kind'), 'input') as HTMLInputElement, {
            target: { value: 'external' },
        });

        expect(queryByTestId('field-externalUrl')).not.toBeNull();
        expect(blob(container)).toEqual({ kind: 'external', externalUrl: 'https://x.test' });
    });
});

describe('registry dispatch', () => {
    const kinds: FieldDescriptorKind[] = [
        'text',
        'textarea',
        'select',
        'checkbox',
        'number',
        'date',
        'email',
        'json',
        'code',
    ];

    it('registers a renderer for every scalar kind', () => {
        const registry = registerScalarFieldWidgets(createFieldRegistry());
        for (const kind of kinds) {
            expect(registry.get(kind)).toBeTypeOf('function');
        }
    });

    it('dispatches each registered scalar descriptor to its widget', () => {
        const descriptors: FieldDescriptor[] = [
            { type: 'text', name: 'a' },
            { type: 'textarea', name: 'b' },
            { type: 'select', name: 'c', options: [{ label: 'X', value: 'x' }] },
            { type: 'checkbox', name: 'd' },
            { type: 'number', name: 'e' },
            { type: 'date', name: 'f' },
            { type: 'email', name: 'g' },
            { type: 'json', name: 'h' },
            { type: 'code', name: 'i' },
        ];
        const { getByTestId } = renderFields(descriptors, {});
        for (const descriptor of descriptors) {
            expect(getByTestId(`field-${'name' in descriptor ? descriptor.name : ''}`)).toBeTruthy();
        }
    });
});
