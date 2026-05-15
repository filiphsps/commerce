'use client';

import { useAllFormFields, useForm } from '@payloadcms/ui';
import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
import { useAutosave } from '@/hooks/use-autosave';

export type ArticleFormProps = {
    /**
     * Server action with domain and id already bound:
     * `saveArticleDraftAction.bind(null, domain, id)`.
     * Signature after binding: `(formData: FormData) => Promise<void>`.
     */
    saveDraftAction: (formData: FormData) => Promise<void>;
    /**
     * Server action with domain and id already bound:
     * `publishArticleAction.bind(null, domain, id)`.
     * Signature after binding: `(formData: FormData) => Promise<void>`.
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
 *
 * Articles have autosave enabled at the collection level (interval: 2000ms),
 * so the `useAutosave` delay here mirrors that config.
 */
export function ArticleForm({ saveDraftAction, publishAction }: ArticleFormProps) {
    const { createFormData } = useForm();

    // Subscribe to Payload's `FormFieldsContext` — the reducer dispatches a
    // new `FormState` array identity on every field mutation (keystroke, blur,
    // array row add/remove, blocks add/remove, etc.). This is the canonical
    // autosave trigger: it's tied to actual field state changes, not to
    // incidental re-renders of this component.
    const [fields] = useAllFormFields();

    const buildAndSaveDraft = async (): Promise<void> => {
        const formData = await createFormData();
        await saveDraftAction(formData);
    };

    const buildAndPublish = async (): Promise<void> => {
        const formData = await createFormData();
        await publishAction(formData);
    };

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
