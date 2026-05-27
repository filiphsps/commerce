'use client';

import { Form, useFormModified } from '@payloadcms/ui';
import type { FormState } from 'payload';
import { type ReactNode, useEffect, useState } from 'react';

export type DocumentFormBodyProps = {
    /** Server action invoked when the user explicitly submits the form. */
    action: (formData: FormData) => Promise<void>;
    /**
     * The latest `FormState` from the server. The mount value is committed to
     * Payload's `<Form>` as its `initialState`; subsequent values are only
     * committed when the form is not modified (see `<InitialStateGate>`).
     */
    initialState?: FormState;
    children: ReactNode;
};

/**
 * Client wrapper around Payload's `<Form>` that keeps Payload's `initialState`
 * locked to a `useState` slot. Without this lock every parent re-render
 * (autosave → `revalidatePath` → Next.js page refresh → fresh `buildFormState`)
 * passes a new `initialState` reference into `<Form>`, whose own effect runs
 * `dispatchFields({ type: 'REPLACE_STATE', optimize: false })` and overwrites
 * every in-flight keystroke. The committed slot only advances when
 * `<InitialStateGate>` (below) sees a fresh prop AND `useFormModified()` is
 * false — so dirty edits survive every server-side refresh until the user
 * either explicitly saves or steps away long enough for `modified` to clear.
 *
 * @param props.action - Server action invoked on explicit form submit.
 * @param props.initialState - Latest FormState from the server; committed only when the form is clean.
 * @param props.children - Field components rendered inside the Payload Form context.
 */
export function DocumentFormBody({ action, initialState, children }: DocumentFormBodyProps) {
    const [committedInitialState, setCommittedInitialState] = useState(initialState);
    return (
        <Form action={action} initialState={committedInitialState} isDocumentForm>
            <InitialStateGate
                latest={initialState}
                committed={committedInitialState}
                onCommit={setCommittedInitialState}
            />
            {children}
        </Form>
    );
}

type InitialStateGateProps = {
    latest: FormState | undefined;
    committed: FormState | undefined;
    onCommit: (state: FormState | undefined) => void;
};

/**
 * Renders nothing; subscribes to `useFormModified()` and commits the parent's
 * latest `initialState` only when the form is clean. Lives inside `<Form>` so
 * the hook can read the form context.
 *
 * @param props.latest - Latest initialState prop from the parent.
 * @param props.committed - Currently committed state held in the parent's useState slot.
 * @param props.onCommit - Callback that advances the committed slot to the latest value.
 */
function InitialStateGate({ latest, committed, onCommit }: InitialStateGateProps) {
    const modified = useFormModified();
    useEffect(() => {
        if (latest !== committed && !modified) {
            onCommit(latest);
        }
    }, [latest, committed, modified, onCommit]);
    return null;
}
