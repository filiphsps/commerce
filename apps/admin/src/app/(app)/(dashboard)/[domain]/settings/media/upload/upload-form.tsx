'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';

export type UploadFormProps = {
    /** The current shop domain — used to construct the post-upload redirect URL. */
    domain: string;
    /**
     * Server action with the shop domain already bound:
     * `createMediaAction.bind(null, domain)`. Signature after binding:
     * `(formData: FormData) => Promise<{ id: string }>`.
     *
     * The action runs the CMSGATE-02 native pipeline server-side (Convex
     * byte-sink upload → `finalizeUpload` → sharp derivative pass), with the
     * operator's Clerk session minting the Convex identity — the browser
     * never holds a storage credential.
     */
    createAction: (formData: FormData) => Promise<{ id: string }>;
};

/**
 * Client upload form for new media files.
 *
 * Invokes a server action that authenticates via Clerk and runs the native
 * Convex media pipeline with the file payload. On success it redirects to the
 * new doc's detail page (or back to the grid on failure).
 *
 * @param props.domain - The current shop domain used to construct the post-upload redirect URL.
 * @param props.createAction - Pre-bound server action `(formData: FormData) => Promise<{ id: string }>`.
 */
export function UploadForm({ domain, createAction }: UploadFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    /** Submits the form via the bound server action and redirects to the new media document on success. @param e - The form submit event. */
    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            try {
                const { id } = await createAction(formData);

                if (id) {
                    router.push(`/${domain}/settings/media/${id}/` as Route);
                } else {
                    router.push(`/${domain}/settings/media/` as Route);
                }
            } catch (error: unknown) {
                console.error('[media] upload failed', error);
                setError(error instanceof Error ? error.message : 'Upload failed.');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="rounded-lg border-2 border-border border-solid bg-card p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="upload-file" className="font-medium text-sm">
                            File{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="upload-file"
                            name="file"
                            type="file"
                            required
                            accept="image/*,video/mp4,application/pdf"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-muted-foreground text-xs">
                            Accepted: images, MP4 video, PDF. Max size enforced server-side.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="upload-alt" className="font-medium text-sm">
                            Alt text{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="upload-alt"
                            name="alt"
                            type="text"
                            required
                            placeholder="Describe the file for screen readers"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="upload-caption" className="font-medium text-sm">
                            Caption <span className="text-muted-foreground text-xs">(optional)</span>
                        </label>
                        <input
                            id="upload-caption"
                            name="caption"
                            type="text"
                            placeholder="Optional caption shown below the media"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>
            </div>

            {error ? (
                <p
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm"
                >
                    {error}
                </p>
            ) : null}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending ? 'Uploading…' : 'Upload'}
                </button>
            </div>
        </form>
    );
}
