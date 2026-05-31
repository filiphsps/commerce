// @vitest-environment happy-dom
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Form } from './form';
import { useField, useForm, useFormModified } from './hooks';
import type { FormState } from './types';

/**
 * `renderHook` wrapper that mounts the hook inside a `<Form initialState>` so
 * the field/form hooks resolve the provider chain.
 */
function renderInForm<T>(hook: () => T, initialState: FormState) {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <Form action={vi.fn()} initialState={initialState}>
            {children}
        </Form>
    );
    return renderHook(hook, { wrapper });
}

const clean = (value: unknown): FormState[string] => ({ value, initialValue: value, valid: true });

describe('useField', () => {
    it('exposes the value at a dotted path', () => {
        const { result } = renderInForm(() => useField({ path: 'seo.title' }), { 'seo.title': clean('Home') });
        expect(result.current.value).toBe('Home');
    });

    it('setValue updates the value', () => {
        const { result } = renderInForm(() => useField({ path: 'seo.title' }), { 'seo.title': clean('Home') });
        act(() => result.current.setValue('About'));
        expect(result.current.value).toBe('About');
    });

    it('returns undefined value for an unset path without throwing', () => {
        const { result } = renderInForm(() => useField({ path: 'missing' }), {});
        expect(result.current.value).toBeUndefined();
    });

    it('throws when used outside a <Form>', () => {
        expect(() => renderHook(() => useField({ path: 'x' }))).toThrow();
    });
});

describe('useFormModified', () => {
    it('is false on mount and true after an edit', () => {
        const { result } = renderInForm(
            () => {
                const field = useField({ path: 'title' });
                const modified = useFormModified();
                return { field, modified };
            },
            { title: clean('A') },
        );
        expect(result.current.modified).toBe(false);
        act(() => result.current.field.setValue('B'));
        expect(result.current.modified).toBe(true);
    });
});

describe('useForm.createFormData', () => {
    it('serializes the form into a nested `_payload` blob', async () => {
        const { result } = renderInForm(() => useForm(), {
            'seo.title': clean('Home'),
            'seo.description': clean('Welcome'),
        });
        let formData: FormData | undefined;
        await act(async () => {
            formData = await result.current.createFormData();
        });
        const raw = formData?.get('_payload');
        expect(JSON.parse(String(raw))).toEqual({ seo: { title: 'Home', description: 'Welcome' } });
    });
});

describe('Form submit', () => {
    it('calls the action with FormData carrying the current `_payload`', async () => {
        const action = vi.fn();
        const { getByTestId } = render(
            <Form action={action} initialState={{ title: clean('A') }}>
                <button data-testid="submit" type="submit">
                    save
                </button>
            </Form>,
        );
        await act(async () => {
            fireEvent.submit(getByTestId('submit').closest('form') as HTMLFormElement);
        });
        expect(action).toHaveBeenCalledTimes(1);
        const fd = action.mock.calls[0]?.[0] as FormData;
        expect(JSON.parse(String(fd.get('_payload')))).toEqual({ title: 'A' });
    });
});

/**
 * Probe that reads two fields and offers a button to dirty `seo.title`.
 */
function Probe() {
    const title = useField({ path: 'seo.title' });
    const description = useField({ path: 'seo.description' });
    return (
        <>
            <span data-testid="title">{String(title.value)}</span>
            <span data-testid="description">{String(description.value)}</span>
            <button data-testid="edit" type="button" onClick={() => title.setValue('Draft')}>
                edit
            </button>
        </>
    );
}

describe('InitialStateGate — REGRESSION (server refresh must not clobber an in-flight edit)', () => {
    it('keeps the user edit for a dirty field while taking server values for clean siblings', () => {
        const first: FormState = { 'seo.title': clean('Old'), 'seo.description': clean('Desc') };
        const second: FormState = { 'seo.title': clean('Server'), 'seo.description': clean('Server desc') };

        const { getByTestId, rerender } = render(
            <Form action={vi.fn()} initialState={first}>
                <Probe />
            </Form>,
        );
        expect(getByTestId('title').textContent).toBe('Old');

        // User types -> seo.title diverges from its initialValue (in-flight dirty).
        act(() => {
            fireEvent.click(getByTestId('edit'));
        });
        expect(getByTestId('title').textContent).toBe('Draft');

        // Server refresh arrives with a brand-new initialState reference.
        rerender(
            <Form action={vi.fn()} initialState={second}>
                <Probe />
            </Form>,
        );

        // The gate: dirty field keeps the user edit; clean sibling takes server value.
        expect(getByTestId('title').textContent).toBe('Draft');
        expect(getByTestId('description').textContent).toBe('Server desc');
    });
});
