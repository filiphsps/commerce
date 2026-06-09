import { type FormState, useField } from '@nordcom/commerce-cms/editor/form';
import { describe, expect, it, vi } from 'vitest';

import { DocumentFormBody } from '@/components/cms/document-form-body';
import { fireEvent, render } from '@/utils/test/react';

/**
 * Minimal field widget bound to the native form context — proves the REAL
 * CMSFORM-01 core is mounted (no Payload mock involved) and lets the tests
 * drive dirty state through `setValue`.
 *
 * @param props.path - Dotted form-state path to bind.
 */
function Probe({ path }: { path: string }) {
    const { value, setValue } = useField<string>({ path });
    return (
        <input data-testid={`probe-${path}`} value={value ?? ''} onChange={(event) => setValue(event.target.value)} />
    );
}

const state = (label: string): FormState => ({ title: { value: label, initialValue: label } });

describe('DocumentFormBody', () => {
    it('mounts the native form core and seeds fields from initialState', () => {
        const { getByTestId, container } = render(
            <DocumentFormBody action={vi.fn()} initialState={state('A')}>
                <Probe path="title" />
            </DocumentFormBody>,
        );
        expect(container.querySelector('form')).not.toBeNull();
        expect((getByTestId('probe-title') as HTMLInputElement).value).toBe('A');
    });

    it('adopts a new server initialState when the field is clean', () => {
        const { getByTestId, rerender } = render(
            <DocumentFormBody action={vi.fn()} initialState={state('A')}>
                <Probe path="title" />
            </DocumentFormBody>,
        );
        rerender(
            <DocumentFormBody action={vi.fn()} initialState={state('B')}>
                <Probe path="title" />
            </DocumentFormBody>,
        );
        expect((getByTestId('probe-title') as HTMLInputElement).value).toBe('B');
    });

    it('keeps a dirty field value when a new server initialState arrives (keystroke-clobber guard)', () => {
        const { getByTestId, rerender } = render(
            <DocumentFormBody action={vi.fn()} initialState={state('A')}>
                <Probe path="title" />
            </DocumentFormBody>,
        );

        // Simulate the user typing before the background refresh lands.
        fireEvent.change(getByTestId('probe-title'), { target: { value: 'typed' } });

        rerender(
            <DocumentFormBody action={vi.fn()} initialState={state('B')}>
                <Probe path="title" />
            </DocumentFormBody>,
        );
        expect((getByTestId('probe-title') as HTMLInputElement).value).toBe('typed');
    });
});
