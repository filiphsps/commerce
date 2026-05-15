'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export type TenantOption = {
    id: string;
    name: string;
};

export type NewUserFormProps = {
    /**
     * Server action: `createUserAction`.
     * Signature: `(formData: FormData) => Promise<{ id: string }>`.
     */
    createAction: (formData: FormData) => Promise<{ id: string }>;
    /**
     * Available tenants for the multi-select, fetched server-side in the page.
     * Each option is `{ id, name }`.
     */
    tenantOptions: TenantOption[];
};

/**
 * Minimal "new user" form.
 *
 * Intentionally does NOT use Payload's `<Form>` component — there is no
 * existing document to anchor an autosave cycle, and users have no drafts.
 * Builds the `_payload` JSON blob manually and calls `createUserAction`,
 * then redirects to the edit route on success.
 *
 * Collects the two required fields (`email`, `role`) and the optional
 * `tenants` multi-select. Password is handled server-side as a throwaway
 * UUID (real auth is via NextAuth).
 *
 * Tenant multi-select: uses a native `<select multiple>`. Each selected option
 * value is a tenant ID. On submit, the selected IDs are mapped to
 * `[{ tenant: id }, ...]` before serializing into `_payload`.
 */
export function NewUserForm({ createAction, tenantOptions }: NewUserFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(formData: FormData) {
        setError(null);

        const email = formData.get('email')?.toString() ?? '';
        const role = formData.get('role')?.toString() ?? '';
        // `getAll` collects all selected options from a <select multiple>
        const selectedTenantIds = formData.getAll('tenants').map((v) => v.toString());
        const tenants = selectedTenantIds.map((tenantId) => ({ tenant: tenantId }));

        const payloadJson = JSON.stringify({ email, role, tenants });
        const wrapped = new FormData();
        wrapped.set('_payload', payloadJson);

        startTransition(async () => {
            try {
                const { id } = await createAction(wrapped);
                router.push(`/users/${id}/` as Route);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to create user.');
            }
        });
    }

    return (
        <form action={handleSubmit} className="flex flex-col gap-6">
            <div className="rounded-lg border-2 border-border border-solid bg-card p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="user-email" className="font-medium text-sm">
                            Email <span className="text-destructive" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="user-email"
                            name="email"
                            type="email"
                            required
                            placeholder="e.g. user@example.com"
                            disabled={isPending}
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="user-role" className="font-medium text-sm">
                            Role <span className="text-destructive" aria-hidden="true">*</span>
                        </label>
                        <select
                            id="user-role"
                            name="role"
                            required
                            disabled={isPending}
                            defaultValue="editor"
                            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {tenantOptions.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="user-tenants" className="font-medium text-sm">
                                Tenants <span className="text-muted-foreground text-xs">(optional)</span>
                            </label>
                            <select
                                id="user-tenants"
                                name="tenants"
                                multiple
                                disabled={isPending}
                                size={Math.min(tenantOptions.length, 6)}
                                className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {tenantOptions.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-muted-foreground text-xs">
                                Hold Ctrl / Cmd to select multiple tenants. Admins have access to all tenants regardless.
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>

            {error ? (
                <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                    {error}
                </p>
            ) : null}

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending ? 'Creating…' : 'Create user'}
                </button>
            </div>
        </form>
    );
}
