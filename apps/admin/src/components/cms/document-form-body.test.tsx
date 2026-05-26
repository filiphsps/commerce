import type { FormState } from 'payload';
import { describe, expect, it, vi } from 'vitest';

import { DocumentFormBody } from '@/components/cms/document-form-body';
import { render } from '@/utils/test/react';

const { capturedInitialStates, modifiedRef } = vi.hoisted(() => ({
    capturedInitialStates: [] as Array<FormState | undefined>,
    modifiedRef: { current: false },
}));

vi.mock('@payloadcms/ui', () => ({
    Form: ({ initialState, children }: { initialState?: FormState; children: React.ReactNode }) => {
        // Record every initialState value Payload's <Form> actually receives,
        // in render order. Lets the assertions check whether new server state
        // reached <Form> or got blocked by the gate.
        capturedInitialStates.push(initialState);
        return <form data-testid="payload-form">{children}</form>;
    },
    useFormModified: () => modifiedRef.current,
}));

const state = (label: string): FormState => ({ title: { value: label, valid: true } }) as unknown as FormState;

describe('DocumentFormBody', () => {
    beforeEach(() => {
        capturedInitialStates.length = 0;
        modifiedRef.current = false;
    });

    it('commits the mount-time initialState to Payload `<Form>`', () => {
        const initial = state('A');
        render(<DocumentFormBody action={vi.fn()} initialState={initial} children={null} />);
        expect(capturedInitialStates[0]).toBe(initial);
    });

    it('forwards a new server initialState to `<Form>` when the form is clean', () => {
        const first = state('A');
        const second = state('B');
        const { rerender } = render(<DocumentFormBody action={vi.fn()} initialState={first} children={null} />);
        expect(capturedInitialStates.at(-1)).toBe(first);

        modifiedRef.current = false;
        rerender(<DocumentFormBody action={vi.fn()} initialState={second} children={null} />);
        // After the gate's effect fires, the committed slot advances and
        // <Form> re-renders with the new initialState. The last capture
        // reflects that commit.
        expect(capturedInitialStates.at(-1)).toBe(second);
    });

    it('keeps the committed initialState when the form is modified (dirty edits survive a refresh)', () => {
        const first = state('A');
        const second = state('B');
        const { rerender } = render(<DocumentFormBody action={vi.fn()} initialState={first} children={null} />);

        // Simulate the user typing — the form context's `modified` flag flips
        // before the parent re-renders with new server data.
        modifiedRef.current = true;
        rerender(<DocumentFormBody action={vi.fn()} initialState={second} children={null} />);

        // The gate must NOT advance the committed slot while modified. Every
        // captured initialState — across both renders — equals `first`.
        expect(capturedInitialStates.every((s) => s === first)).toBe(true);
    });

    it('catches up to the latest server state once the form transitions back to clean', () => {
        const first = state('A');
        const second = state('B');
        const { rerender } = render(<DocumentFormBody action={vi.fn()} initialState={first} children={null} />);

        modifiedRef.current = true;
        rerender(<DocumentFormBody action={vi.fn()} initialState={second} children={null} />);
        // Still locked to `first` because modified=true.
        expect(capturedInitialStates.at(-1)).toBe(first);

        modifiedRef.current = false;
        rerender(<DocumentFormBody action={vi.fn()} initialState={second} children={null} />);
        // Now the gate releases — the next captured initialState is `second`.
        expect(capturedInitialStates.at(-1)).toBe(second);
    });
});
