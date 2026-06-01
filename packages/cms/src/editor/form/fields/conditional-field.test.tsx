// @vitest-environment happy-dom
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { checkboxField, condition, groupField, textField } from '../../../descriptors';
import type { FieldDescriptor } from '../../../descriptors/types';
import { Form } from '../form';
import { useFormFields } from '../hooks';
import { createFieldRegistry, RenderFields } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';
import { ConditionalField } from './conditional';
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

describe('ConditionalField wrapper', () => {
    it('mounts and unmounts a wrapped leaf on a sibling value change, pruning then restoring its value', () => {
        const registry = registerScalarFieldWidgets(createFieldRegistry());
        const urlField: FieldDescriptor = condition(
            textField({ name: 'externalUrl', label: 'External URL' }),
            (_data, sibling) => sibling.kind === 'external',
        );

        const { getByTestId, queryByTestId, container } = render(
            <Form action={vi.fn()} initialState={{ kind: clean('internal'), externalUrl: clean('https://x.test') }}>
                <RenderFields registry={registry} fields={[textField({ name: 'kind', label: 'Kind' })]} parentPath="" />
                <ConditionalField field={urlField} path="externalUrl" registry={registry} />
                <Blob />
            </Form>,
        );

        expect(queryByTestId('field-externalUrl')).toBeNull();
        expect(blob(container)).toEqual({ kind: 'internal' });

        fireEvent.change(controlOf(getByTestId('field-kind'), 'input') as HTMLInputElement, {
            target: { value: 'external' },
        });

        expect(queryByTestId('field-externalUrl')).not.toBeNull();
        expect(blob(container)).toEqual({ kind: 'external', externalUrl: 'https://x.test' });
    });

    it('prunes a hidden group’s entire subtree and restores every descendant on re-show', () => {
        const registry = registerCompositeFieldWidgets(registerScalarFieldWidgets(createFieldRegistry()));
        const shipping: FieldDescriptor = condition(
            groupField({
                name: 'shipping',
                label: 'Shipping',
                fields: [textField({ name: 'carrier' }), textField({ name: 'tracking' })],
            }),
            (_data, sibling) => sibling.physical === true,
        );

        const { getByTestId, queryByTestId, container } = render(
            <Form
                action={vi.fn()}
                initialState={{
                    physical: clean(false),
                    'shipping.carrier': clean('UPS'),
                    'shipping.tracking': clean('1Z'),
                }}
            >
                <RenderFields registry={registry} fields={[checkboxField({ name: 'physical' })]} parentPath="" />
                <ConditionalField field={shipping} path="shipping" registry={registry} />
                <Blob />
            </Form>,
        );

        expect(queryByTestId('group-shipping')).toBeNull();
        expect(blob(container)).toEqual({ physical: false });

        fireEvent.click(controlOf(getByTestId('field-physical'), 'input[type="checkbox"]') as HTMLInputElement);

        expect(queryByTestId('group-shipping')).not.toBeNull();
        expect(blob(container)).toEqual({ physical: true, shipping: { carrier: 'UPS', tracking: '1Z' } });
    });

    it('renders the wrapped field unconditionally when it carries no condition', () => {
        const registry = registerScalarFieldWidgets(createFieldRegistry());
        const { getByTestId } = render(
            <Form action={vi.fn()} initialState={{ title: clean('Home') }}>
                <ConditionalField field={textField({ name: 'title' })} path="title" registry={registry} />
            </Form>,
        );
        expect((controlOf(getByTestId('field-title'), 'input') as HTMLInputElement).value).toBe('Home');
    });
});
