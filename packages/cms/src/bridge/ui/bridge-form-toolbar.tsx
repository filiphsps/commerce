'use client';

import { Button, useForm } from '@payloadcms/ui';
import { useState, useTransition } from 'react';

export type BridgeFormToolbarProps = {
    /**
     * Server action with domain + id already bound.
     * Signature after binding: `(formData: FormData) => Promise<void>`.
     *
     * Wired via `<Form action={saveAction}>` outside this component; the
     * Save button reads Payload's form context via `useForm()` to collect
     * field values before calling the action directly.
     */
    saveAction: (formData: FormData) => Promise<void>;
    /**
     * Server action with domain + id already bound.
     * Signature after binding: `() => Promise<void>`.
     *
     * Omit to hide the Delete button.
     */
    deleteAction?: () => Promise<void>;
};

/**
 * Client component that renders Save and (optionally) Delete affordances for
 * bridge record edit pages.
 *
 * Must be rendered inside Payload's `<Form>` so that `useForm()` can read the
 * form context and build the `FormData` payload on save. Place this in the
 * `toolbar` slot of `<DocumentForm>` or equivalent.
 *
 * Mirrors the pattern established in
 * `apps/admin/src/app/(app)/(dashboard)/[domain]/settings/tenants/[id]/tenant-form.tsx`.
 */
export function BridgeFormToolbar({ saveAction, deleteAction }: BridgeFormToolbarProps) {
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
                setErrorMessage(err instanceof Error ? err.message : 'Failed to save.');
            }
        });
    };

    const handleDelete = () => {
        if (!deleteAction) return;
        if (!window.confirm('Delete this record? This cannot be undone.')) return;
        setErrorMessage(null);
        startDeleteTransition(async () => {
            try {
                await deleteAction();
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : 'Failed to delete.');
            }
        });
    };

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="flex-1" />

                <div className="flex items-center gap-3">
                    {deleteAction ? (
                        <Button
                            buttonStyle="error"
                            disabled={isSavePending || isDeletePending}
                            onClick={handleDelete}
                            type="button"
                        >
                            {isDeletePending ? 'Deleting…' : 'Delete'}
                        </Button>
                    ) : null}
                    <Button
                        buttonStyle="primary"
                        disabled={isSavePending || isDeletePending}
                        onClick={handleSave}
                        type="button"
                    >
                        {isSavePending ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>

            {errorMessage ? (
                <p className="text-sm" role="alert" style={{ color: 'var(--theme-error-500)' }}>
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
