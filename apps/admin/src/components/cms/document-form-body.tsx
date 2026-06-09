'use client';

import { Form, type FormState } from '@nordcom/commerce-cms/editor/form';
import type { ReactNode } from 'react';

export type DocumentFormBodyProps = {
    /** Server action invoked when the user explicitly submits the form. */
    action: (formData: FormData) => Promise<void>;
    /**
     * The latest server-built `FormState`. The native `<Form>` seeds its
     * reducer from the mount value and re-merges every subsequent reference
     * change under the reducer's InitialStateGate (`REPLACE_STATE`), which
     * overlays any dirty field's in-flight value over the incoming server
     * state — per field, not all-or-nothing.
     */
    initialState?: FormState;
    children: ReactNode;
};

/**
 * Mounts the native CMSFORM-01 `<Form>` for a document editor surface — the
 * Payload `<Form>` replacement (CMSDATA-06). The keystroke-clobber lock the
 * Payload era needed here (`useState` commit slot + `<InitialStateGate>`) is
 * gone: the native reducer's `REPLACE_STATE` branch performs the same
 * dirty-preserving merge internally, so a background refresh
 * (autosave → `revalidatePath` → fresh server state) never overwrites what
 * the user is typing.
 *
 * @param props.action - Server action invoked on explicit form submit.
 * @param props.initialState - Latest FormState from the server; merged under the reducer gate.
 * @param props.children - Field components rendered inside the native form context.
 */
export function DocumentFormBody({ action, initialState, children }: DocumentFormBodyProps) {
    return (
        <Form action={action} initialState={initialState} isDocumentForm>
            {children}
        </Form>
    );
}
