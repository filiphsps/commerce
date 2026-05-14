'use client';

import { useForm } from '@payloadcms/ui';
import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
import { useAutosave } from '@/hooks/use-autosave';

export type BusinessDataFormProps = {
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
 * Must be rendered inside Payload's `<Form>` — `useForm()` reads from that
 * context. `<DocumentForm>` already provides `<Form>`, so placing this
 * component in the `toolbar` slot satisfies that requirement.
 */
export function BusinessDataForm({ saveDraftAction, publishAction }: BusinessDataFormProps) {
    const { createFormData } = useForm();

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

    // Feed the autosave hook the FormData-based save action. The `state`
    // passed here is a stable reference sentinel: a new object literal is
    // created on every render which causes the autosave debounce to reset on
    // every re-render — that IS the desired behaviour (re-render ≈ field
    // change for Payload forms). A referentially stable value would never
    // trigger the autosave effect.
    //
    // We can't easily pass `FormState` here because `useAllFormFields()` is
    // stable across renders (selector based). Instead we use a dummy object
    // counter approach via a re-render trigger from the Form context changes.
    // The save action itself calls `createFormData()` to read latest state.
    const { isSaving, lastSavedAt } = useAutosave<() => Promise<void>>({
        state: buildAndSaveDraft,
        saveAction: async (fn) => fn(),
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
