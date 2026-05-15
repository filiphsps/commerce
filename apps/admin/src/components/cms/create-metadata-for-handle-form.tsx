'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FormEvent, useTransition } from 'react';

export type CreateMetadataForHandleFormProps = {
    /**
     * The tenant domain — used to build the navigation URL.
     */
    domain: string;
    /**
     * The content sub-path for this metadata collection.
     * e.g. `"product-metadata"` or `"collection-metadata"`.
     */
    basePath: string;
    /**
     * Placeholder text shown inside the handle input.
     * Defaults to "Shopify handle…".
     */
    placeholder?: string;
};

/**
 * Inline form that lets operators open (or create) a metadata edit page for
 * a given Shopify handle.
 *
 * On submit it navigates to `/<domain>/content/<basePath>/<handle>/`.
 * No server action is invoked — the edit/upsert route will create the doc on
 * first save if it doesn't already exist, keeping the flow simple and
 * avoiding a race between "create stub" and "open editor".
 *
 * Shared between the product-metadata and collection-metadata list pages so
 * both display a consistent "open by handle" affordance.
 */
export function CreateMetadataForHandleForm({ domain, basePath, placeholder }: CreateMetadataForHandleFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const handle = String(fd.get('handle') ?? '').trim();
        if (!handle) return;

        startTransition(() => {
            router.push(`/${domain}/content/${basePath}/${encodeURIComponent(handle)}/` as Route);
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
                name="handle"
                type="text"
                required
                placeholder={placeholder ?? 'Shopify handle…'}
                disabled={isPending}
                className="w-56 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Shopify handle"
            />
            <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isPending ? 'Opening…' : 'Open'}
            </button>
        </form>
    );
}
