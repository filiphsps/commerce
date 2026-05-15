'use client';

import { useState, useTransition } from 'react';

export type MediaFormProps = {
    /** Payload id of the media doc — used only for accessible labels. */
    mediaId: string;
    /** Current value of the `alt` field. Required on the collection. */
    initialAlt: string;
    /** Current value of the `caption` field. Empty string when null/undefined. */
    initialCaption: string;
    /**
     * Server action with id already bound:
     * `updateMediaAction.bind(null, id)`.
     * Signature after binding: `(formData: FormData) => Promise<void>`.
     */
    updateAction: (formData: FormData) => Promise<void>;
    /**
     * Server action with id already bound:
     * `deleteMediaAction.bind(null, id)`.
     * Signature after binding: `(_formData?: FormData) => Promise<void>`.
     *
     * Invoked by a `<form action={deleteAction}>` submit so Next.js passes
     * the FormData automatically (the action ignores it).
     */
    deleteAction: (_formData?: FormData) => Promise<void>;
};

/**
 * Hand-rolled edit form for the media collection's two editable fields:
 * `alt` (required) and `caption` (optional, localized).
 *
 * Does NOT use Payload's `<Form>` / `<RenderFields>` — the fields are
 * trivially simple and the media collection has no drafts, autosave, or
 * versions. A plain form avoids the Payload form-context overhead entirely.
 *
 * Save submits via a server action. Delete uses a separate `<form>` with
 * its own `action` so the two operations are never confused by the browser.
 */
export function MediaForm({ mediaId, initialAlt, initialCaption, updateAction, deleteAction }: MediaFormProps) {
    const [isSavePending, startSaveTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const isPending = isSavePending || isDeletePending;

    function handleSave(formData: FormData) {
        setSaveError(null);
        setSaveSuccess(false);
        startSaveTransition(async () => {
            try {
                await updateAction(formData);
                setSaveSuccess(true);
            } catch (err) {
                console.error('[media] save failed', err);
                setSaveError(err instanceof Error ? err.message : 'Failed to save.');
            }
        });
    }

    function handleDelete(formData: FormData) {
        if (!window.confirm('Delete this media file? This cannot be undone.')) {
            return;
        }
        startDeleteTransition(async () => {
            try {
                await deleteAction(formData);
            } catch (err) {
                // `deleteMediaAction` redirects on success, which throws internally.
                // Catch and re-throw only genuine errors; redirect throws are expected.
                const message = err instanceof Error ? err.message : String(err);
                if (!message.startsWith('NEXT_REDIRECT') && !message.startsWith('NEXT_NOT_FOUND')) {
                    console.error('[media] delete failed', err);
                    setSaveError(message || 'Failed to delete.');
                }
            }
        });
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Save form */}
            <form action={handleSave} className="flex flex-col gap-4">
                <div className="rounded-lg border-2 border-border border-solid bg-card p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor={`media-alt-${mediaId}`} className="font-medium text-sm">
                                Alt text{' '}
                                <span className="text-destructive" aria-hidden="true">
                                    *
                                </span>
                            </label>
                            <input
                                id={`media-alt-${mediaId}`}
                                name="alt"
                                type="text"
                                required
                                defaultValue={initialAlt}
                                placeholder="Describe the file for screen readers"
                                disabled={isPending}
                                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor={`media-caption-${mediaId}`} className="font-medium text-sm">
                                Caption <span className="text-muted-foreground text-xs">(optional)</span>
                            </label>
                            <input
                                id={`media-caption-${mediaId}`}
                                name="caption"
                                type="text"
                                defaultValue={initialCaption}
                                placeholder="Optional caption shown below the media"
                                disabled={isPending}
                                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>

                {saveError ? (
                    <p
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
                    >
                        {saveError}
                    </p>
                ) : null}

                {saveSuccess && !saveError ? (
                    <p
                        role="status"
                        className="rounded-md border border-border bg-muted px-4 py-3 text-muted-foreground text-sm"
                    >
                        Saved.
                    </p>
                ) : null}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSavePending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>

            {/* Delete form — separate <form> to avoid accidentally submitting delete on Enter in the text fields */}
            <form action={handleDelete} className="border-border border-t pt-4">
                <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-sm">
                        Permanently delete this file and all generated sizes.
                    </p>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-md border border-destructive/50 px-4 py-2 text-destructive text-sm hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDeletePending ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </form>
        </div>
    );
}
