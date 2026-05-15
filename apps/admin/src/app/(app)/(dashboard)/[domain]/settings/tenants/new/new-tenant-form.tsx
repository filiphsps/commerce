'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export type NewTenantFormProps = {
    /**
     * Server action with domain already bound:
     * `createTenantAction.bind(null, domain)`.
     * Signature after binding: `(formData: FormData) => Promise<{ id: string }>`.
     */
    createAction: (formData: FormData) => Promise<{ id: string }>;
    /** The current shop domain — used to construct the post-create redirect URL. */
    domain: string;
};

/**
 * Minimal "new tenant" form.
 *
 * Intentionally does NOT use Payload's `<Form>` component — there is no
 * existing document to anchor an autosave cycle, and tenants have no drafts.
 * Builds the `_payload` JSON blob manually and calls `createTenantAction`,
 * then redirects to the edit route on success.
 *
 * Collects the four required fields (`name`, `slug`, `defaultLocale`,
 * `locales`) plus the optional `shopId`. All other editing is done in the
 * full edit form after the doc is created.
 */
export function NewTenantForm({ createAction, domain }: NewTenantFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(formData: FormData) {
        setError(null);

        const name = formData.get('name')?.toString() ?? '';
        const slug = formData.get('slug')?.toString() ?? '';
        const defaultLocale = formData.get('defaultLocale')?.toString() ?? '';
        // locales: comma-separated input, split and trim
        const localesRaw = formData.get('locales')?.toString() ?? '';
        const locales = localesRaw
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean);
        const shopId = formData.get('shopId')?.toString() ?? undefined;

        const payloadJson = JSON.stringify({ name, slug, defaultLocale, locales, ...(shopId ? { shopId } : {}) });
        const wrapped = new FormData();
        wrapped.set('_payload', payloadJson);

        startTransition(async () => {
            try {
                const { id } = await createAction(wrapped);
                router.push(`/${domain}/settings/tenants/${id}/` as Route);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create tenant.');
            }
        });
    }

    return (
        <form action={handleSubmit} className="flex flex-col gap-6">
            <div className="rounded-lg border-2 border-border border-solid bg-card p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="tenant-name" className="font-medium text-sm">
                            Name{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="tenant-name"
                            name="name"
                            type="text"
                            required
                            placeholder="e.g. Acme Store"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="tenant-slug" className="font-medium text-sm">
                            Slug{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="tenant-slug"
                            name="slug"
                            type="text"
                            required
                            placeholder="e.g. acme-store"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-muted-foreground text-xs">Must be unique across all tenants.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="tenant-defaultLocale" className="font-medium text-sm">
                            Default Locale{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="tenant-defaultLocale"
                            name="defaultLocale"
                            type="text"
                            required
                            defaultValue="en-US"
                            placeholder="e.g. en-US"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="tenant-locales" className="font-medium text-sm">
                            Locales{' '}
                            <span className="text-destructive" aria-hidden="true">
                                *
                            </span>
                        </label>
                        <input
                            id="tenant-locales"
                            name="locales"
                            type="text"
                            required
                            defaultValue="en-US"
                            placeholder="e.g. en-US, sv-SE"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-muted-foreground text-xs">Comma-separated list of locale codes.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="tenant-shopId" className="font-medium text-sm">
                            Shop ID <span className="text-muted-foreground text-xs">(optional)</span>
                        </label>
                        <input
                            id="tenant-shopId"
                            name="shopId"
                            type="text"
                            placeholder="MongoDB ObjectId from @nordcom/commerce-db"
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
                    {isPending ? 'Creating…' : 'Create tenant'}
                </button>
            </div>
        </form>
    );
}
