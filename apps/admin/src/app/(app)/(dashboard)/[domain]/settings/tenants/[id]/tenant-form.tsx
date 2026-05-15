'use client';

import { Button } from '@nordcom/nordstar';
import { useForm } from '@payloadcms/ui';
import { useState, useTransition } from 'react';

export type TenantFormProps = {
    /**
     * Server action with id already bound:
     * `updateTenantAction.bind(null, id)`.
     * Signature after binding: `(formData: FormData) => Promise<void>`.
     *
     * No autosave — tenants have no drafts. A single "Save" button triggers
     * the write directly.
     */
    saveAction: (formData: FormData) => Promise<void>;
    /**
     * Server action with id already bound:
     * `deleteTenantAction.bind(null, id)`.
     * Signature after binding: `() => Promise<void>`.
     */
    deleteAction: () => Promise<void>;
};

/**
 * Client component that wires Payload's form context to the "Save" and
 * "Delete" buttons for the tenant edit page.
 *
 * Must be rendered inside Payload's `<Form>` — `useForm()` reads from that
 * context. `<DocumentForm>` renders its `toolbar` slot inside `<Form>`, so
 * placing this component there satisfies that requirement.
 *
 * No autosave — tenants have no `versions:` config, so there are no drafts
 * and autosave would be meaningless. A plain "Save" button is the full story.
 */
export function TenantForm({ saveAction, deleteAction }: TenantFormProps) {
    const { createFormData } = useForm();
    const [isSavePending, startSaveTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSave = () => {
        setErrorMessage(null);
        startSaveTransition(async () => {
            try {
                const formData = await createFormData(undefined, {});
                await saveAction(formData);
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : 'Failed to save tenant.');
            }
        });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this tenant? This cannot be undone and will leave orphaned content.')) {
            return;
        }
        setErrorMessage(null);
        startDeleteTransition(async () => {
            try {
                await deleteAction();
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : 'Failed to delete tenant.');
            }
        });
    };

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="flex-1" />

                <div className="flex items-center gap-3">
                    <Button
                        as="button"
                        type="button"
                        variant="outline"
                        color="destructive"
                        disabled={isSavePending || isDeletePending}
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                    <Button
                        as="button"
                        type="button"
                        variant="solid"
                        color="primary"
                        disabled={isSavePending || isDeletePending}
                        onClick={handleSave}
                    >
                        {isSavePending ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>

            {errorMessage ? (
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
