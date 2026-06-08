// @vitest-environment happy-dom
import { act, fireEvent, render } from '@testing-library/react';
// next/cache is mocked so we can assert the autosave path NEVER revalidates.
// Neither <Form> nor useAutosave imports it — proving zero revalidation is
// exactly the point of the assertion.
import { revalidatePath } from 'next/cache';
import type { Field } from 'payload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './autosave';
import { Form } from './form';
import { useField } from './hooks';
import type { FormState } from './types';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const clean = (value: unknown): FormState[string] => ({ value, initialValue: value, valid: true });

const titleFields: Field[] = [{ name: 'title', type: 'text' }];

/**
 * Mounts {@link useAutosave} inside the form so it resolves the provider chain.
 */
function AutosaveRunner({ save }: { save: (formData: FormData) => Promise<unknown> }) {
    useAutosave({ fields: titleFields, save, intervalMs: 2000 });
    return null;
}

/**
 * Reads `title` and exposes a button that types a new value into it.
 */
function Probe() {
    const title = useField<string>({ path: 'title' });
    return (
        <>
            <span data-testid="title">{String(title.value)}</span>
            <button data-testid="edit" type="button" onClick={() => title.setValue('Typed')}>
                edit
            </button>
        </>
    );
}

describe('useAutosave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('does not fire for an untouched form (baseline seeded on mount)', async () => {
        const save = vi.fn().mockResolvedValue({ documentId: 'd', versionId: 'v' });
        render(
            <Form action={vi.fn()} initialState={{ title: clean('Server') }}>
                <AutosaveRunner save={save} />
            </Form>,
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(save).not.toHaveBeenCalled();
    });

    it('fires a 2s autosave after an edit, posting the in-flight value', async () => {
        const save = vi.fn().mockResolvedValue({ documentId: 'd', versionId: 'v' });
        const { getByTestId } = render(
            <Form action={vi.fn()} initialState={{ title: clean('Server') }}>
                <Probe />
                <AutosaveRunner save={save} />
            </Form>,
        );

        act(() => {
            fireEvent.click(getByTestId('edit'));
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(save).toHaveBeenCalledTimes(1);
        const fd = save.mock.calls[0]?.[0] as FormData;
        expect(JSON.parse(String(fd.get('_payload')))).toEqual({ title: 'Typed' });
    });

    it('keeps the in-flight keystroke when a server initialState refresh lands mid-edit', async () => {
        const save = vi.fn().mockResolvedValue({ documentId: 'd', versionId: 'v' });
        const { getByTestId, rerender } = render(
            <Form action={vi.fn()} initialState={{ title: clean('Server') }}>
                <Probe />
                <AutosaveRunner save={save} />
            </Form>,
        );

        // User types -> title diverges from its initialValue (dirty/in-flight).
        act(() => {
            fireEvent.click(getByTestId('edit'));
        });
        expect(getByTestId('title').textContent).toBe('Typed');

        // The 2s autosave fires.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        expect(save).toHaveBeenCalledTimes(1);

        // A fresh server-built state lands (autosave -> background refresh).
        rerender(
            <Form action={vi.fn()} initialState={{ title: clean('Server v2') }}>
                <Probe />
                <AutosaveRunner save={save} />
            </Form>,
        );

        // The InitialStateGate keeps the user's keystroke for the dirty field.
        expect(getByTestId('title').textContent).toBe('Typed');
    });

    it('performs zero revalidation on the autosave path', async () => {
        const save = vi.fn().mockResolvedValue({ documentId: 'd', versionId: 'v' });
        const { getByTestId } = render(
            <Form action={vi.fn()} initialState={{ title: clean('Server') }}>
                <Probe />
                <AutosaveRunner save={save} />
            </Form>,
        );

        act(() => {
            fireEvent.click(getByTestId('edit'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(save).toHaveBeenCalledTimes(1);
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('does not re-post an unchanged blob on the next tick', async () => {
        const save = vi.fn().mockResolvedValue({ documentId: 'd', versionId: 'v' });
        const { getByTestId } = render(
            <Form action={vi.fn()} initialState={{ title: clean('Server') }}>
                <Probe />
                <AutosaveRunner save={save} />
            </Form>,
        );

        act(() => {
            fireEvent.click(getByTestId('edit'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        // A second tick with no further edits must not re-send the same blob.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(save).toHaveBeenCalledTimes(1);
    });
});
