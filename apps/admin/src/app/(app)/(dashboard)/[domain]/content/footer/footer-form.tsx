'use client';

import { useAllFormFields, useForm } from '@payloadcms/ui';
import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
import { useAutosave } from '@/hooks/use-autosave';

export type FooterFormProps = {
    /**
     * Server action (domain already bound) that saves form state as a draft.
     * Accepts a `FormData` built from the live form state.
     */
    saveDraftAction: (formData: FormData) => Promise<void>;
    /**
     * Server action (domain already bound) that publishes the form.
     * Accepts a `FormData` built from the live form state.
     */
    publishAction: (formData: FormData) => Promise<void>;
};

/**
 * Client component that wires Payload's form context to:
 *   - `useAutosave` — debounced draft save every 2 s after a field change
 *   - `<DraftPublishToolbar>` — manual "Save Draft" / "Publish" buttons
 *
 * Must be rendered inside Payload's `<Form>` — `useForm()` and
 * `useAllFormFields()` both read from that context. `<DocumentForm>` renders
 * its `toolbar` slot inside `<Form>`, so placing this component there
 * satisfies that requirement.
 */
export function FooterForm({ saveDraftAction, publishAction }: FooterFormProps) {
    const { createFormData } = useForm();

    // Subscribe to Payload's `FormFieldsContext` — the reducer dispatches a
    // new `FormState` array identity on every field mutation (keystroke, blur,
    // array row add/remove, etc.). This is the canonical autosave trigger:
    // it's tied to actual field state changes, not to incidental re-renders
    // of this component. Future Payload versions that memoise `<Form>`
    // children or `createFormData` won't break autosave because we don't
    // rely on this component re-rendering on every keystroke.
    const [fields] = useAllFormFields();

    /**
     * Build a FormData from the live form state and call the supplied server
     * action. This is the bridge between Payload's client-side form state and
     * our server action that expects `FormData` with a `_payload` JSON key.
     *
     * `createFormData()` is Payload's own helper — it serialises the current
     * field values exactly as Payload's native `<Form>` submit path does, so
     * the server action's `parseFormData` reads the same format.
     */
    const buildAndSaveDraft = async (): Promise<void> => {
        const formData = await createFormData();
        await saveDraftAction(formData);
    };

    const buildAndPublish = async (): Promise<void> => {
        const formData = await createFormData();
        await publishAction(formData);
    };

    // `useAutosave` reads `saveAction` via a ref on every fire (see hook
    // implementation), so even though the closure here captures the current
    // `createFormData` / `saveDraftAction` references, the latest values are
    // picked up at fire time. `fields` is the debounce trigger — when its
    // identity changes (a field mutated), the 2 s timer re-arms; when
    // mutations stop for 2 s, the save fires.
    const { isSaving, lastSavedAt } = useAutosave({
        state: fields,
        saveAction: async () => {
            const formData = await createFormData();
            await saveDraftAction(formData);
        },
        delay: 2000,
    });

    return (
        <DraftPublishToolbar
            saveDraftAction={buildAndSaveDraft}
            publishAction={buildAndPublish}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
        />
    );
}
