'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';

export type MediaMetadataFormProps = {
    /** The media document being edited. */
    mediaId: string;
    /** The stored alt text, seeding the required field. */
    alt: string;
    /** The stored caption, or `null` when unset. */
    caption: string | null;
    /** Whether the asset is an image — non-images carry no focal point, so the inputs hide. */
    isImage: boolean;
    /** The stored `0..1` focal point, or `null` before the first derivative pass recorded one. */
    focal: { x: number; y: number } | null;
    /**
     * Server action with the shop domain already bound:
     * `updateMediaMetadataAction.bind(null, domain)`. The action authenticates via Clerk and
     * posts the update through Convex's tenant-scoped `cms/media:updateMediaMetadata`; a focal
     * move additionally re-runs the Node-side sharp regeneration pass.
     */
    updateAction: (formData: FormData) => Promise<{ id: string }>;
};

/**
 * Client edit form for a media document's post-upload editorial metadata: alt text, caption, and
 * (for images) the `0..1` focal point that drives the derivative crops. Submits through the bound
 * server action and refreshes the route on success so the detail view re-reads the updated row —
 * the same native-widget shape as the upload form (no form library, server-enforced policy).
 *
 * @param props - {@link MediaMetadataFormProps} carrying the stored values and the bound action.
 * @returns The rendered metadata form.
 */
export function MediaMetadataForm({ mediaId, alt, caption, isImage, focal, updateAction }: MediaMetadataFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    /**
     * Submits the form via the bound server action, surfacing failures inline and refreshing the
     * server-rendered detail view on success.
     *
     * @param e - The form submit event.
     */
    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSaved(false);

        const formData = new FormData(e.currentTarget);
        formData.set('mediaId', mediaId);

        startTransition(async () => {
            try {
                await updateAction(formData);
                setSaved(true);
                router.refresh();
            } catch (error: unknown) {
                console.error('[media] metadata update failed', error);
                setError(error instanceof Error ? error.message : 'Update failed.');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} aria-label="Edit metadata" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="media-alt" className="font-medium text-sm">
                    Alt text{' '}
                    <span className="text-destructive" aria-hidden="true">
                        *
                    </span>
                </label>
                <input
                    id="media-alt"
                    name="alt"
                    type="text"
                    required
                    defaultValue={alt}
                    disabled={isPending}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="media-caption" className="font-medium text-sm">
                    Caption <span className="text-muted-foreground text-xs">(optional — clear to remove)</span>
                </label>
                <input
                    id="media-caption"
                    name="caption"
                    type="text"
                    defaultValue={caption ?? ''}
                    disabled={isPending}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            {isImage ? (
                <fieldset className="flex flex-col gap-1.5">
                    <legend className="font-medium text-sm">
                        Focal point <span className="text-muted-foreground text-xs">(0–1; re-crops all sizes)</span>
                    </legend>
                    <div className="flex gap-3">
                        <label htmlFor="media-focal-x" className="flex items-center gap-2 text-sm">
                            X
                            <input
                                id="media-focal-x"
                                name="focalX"
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                defaultValue={focal?.x ?? 0.5}
                                disabled={isPending}
                                className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </label>
                        <label htmlFor="media-focal-y" className="flex items-center gap-2 text-sm">
                            Y
                            <input
                                id="media-focal-y"
                                name="focalY"
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                defaultValue={focal?.y ?? 0.5}
                                disabled={isPending}
                                className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </label>
                    </div>
                </fieldset>
            ) : null}

            {error ? (
                <p
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
                >
                    {error}
                </p>
            ) : null}
            {saved && !error ? (
                <p role="status" className="text-muted-foreground text-sm">
                    Saved.
                </p>
            ) : null}

            <div className="flex justify-start">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending ? 'Saving…' : 'Save metadata'}
                </button>
            </div>
        </form>
    );
}
