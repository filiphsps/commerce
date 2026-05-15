'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export type NewArticleFormProps = {
    /**
     * Server action with domain bound: `createArticleAction.bind(null, domain)`.
     * Signature after binding: `(formData: FormData) => Promise<{ id: string }>`.
     */
    createAction: (formData: FormData) => Promise<{ id: string }>;
    /**
     * The tenant domain — needed to build the redirect URL after creation.
     * Passed down from the RSC so this component doesn't need its own
     * params access.
     */
    domain: string;
};

/**
 * Minimal "new article" form.
 *
 * Intentionally does NOT use Payload's `<Form>` component because there is no
 * existing document to anchor an autosave cycle. Instead it builds the
 * `_payload` JSON blob manually from the raw inputs and calls
 * `createArticleAction`, then redirects to the edit route on success.
 *
 * Only title, slug, and author are collected here — all other fields
 * (publishedAt, cover, excerpt, body, tags, seo) are edited in the full
 * DocumentForm after the doc is created.
 */
export function NewArticleForm({ createAction, domain }: NewArticleFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(formData: FormData) {
        setError(null);

        // Build the _payload JSON blob manually — same format that
        // parseFormData in articles.ts reads.
        const title = formData.get('title')?.toString() ?? '';
        const slug = formData.get('slug')?.toString() ?? '';
        const author = formData.get('author')?.toString() ?? '';
        const payloadJson = JSON.stringify({ title, slug, author });
        const wrapped = new FormData();
        wrapped.set('_payload', payloadJson);

        startTransition(async () => {
            try {
                const { id } = await createAction(wrapped);
                router.push(`/${domain}/content/articles/${id}/` as Route);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create article.');
            }
        });
    }

    return (
        <form action={handleSubmit} className="flex flex-col gap-6">
            <div className="rounded-lg border-2 border-border border-solid bg-card p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="article-title" className="font-medium text-sm">
                            Title{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="article-title"
                            name="title"
                            type="text"
                            required
                            placeholder="e.g. Getting Started Guide"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="article-slug" className="font-medium text-sm">
                            Slug{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="article-slug"
                            name="slug"
                            type="text"
                            required
                            placeholder="e.g. getting-started-guide"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-muted-foreground text-xs">
                            Used in the URL. Must be unique for this tenant.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="article-author" className="font-medium text-sm">
                            Author{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="article-author"
                            name="author"
                            type="text"
                            required
                            placeholder="e.g. Jane Doe"
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
                    {isPending ? 'Creating…' : 'Create article'}
                </button>
            </div>
        </form>
    );
}
