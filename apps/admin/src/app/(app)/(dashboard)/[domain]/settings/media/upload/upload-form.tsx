'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';

export type UploadFormProps = {
    /** The current shop domain — used to construct the post-upload redirect URL. */
    domain: string;
};

/**
 * Client upload form for new media files.
 *
 * Posts to Payload's REST upload endpoint (`/api/media`) using `fetch()` so
 * the browser doesn't navigate to the raw JSON response. On success it
 * redirects to the new doc's edit page (or back to the grid on failure).
 *
 * The `multipart/form-data` encoding is set automatically when `FormData` is
 * passed as the `fetch` body — do not set `Content-Type` manually or the
 * boundary string will be missing and Payload's multipart parser will reject
 * the upload.
 */
export function UploadForm({ domain }: UploadFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            try {
                const res = await fetch('/api/media', {
                    method: 'POST',
                    // Do NOT set Content-Type — the browser sets it automatically
                    // including the correct multipart boundary when body is FormData.
                    body: formData,
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Upload failed (${res.status}): ${text}`);
                }

                const json = (await res.json()) as { doc?: { id?: unknown }; id?: unknown };
                // Payload's REST returns `{ doc: { id, ... }, errors: [] }` on success.
                const id = (json?.doc?.id ?? json?.id) as string | undefined;

                if (id) {
                    router.push(`/${domain}/settings/media/${id}/` as Route);
                } else {
                    router.push(`/${domain}/settings/media/` as Route);
                }
            } catch (err) {
                console.error('[media] upload failed', err);
                setError(err instanceof Error ? err.message : 'Upload failed.');
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
