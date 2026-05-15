'use client';

import { Button } from '@nordcom/nordstar';
import { useForm } from '@payloadcms/ui';
import { useState, useTransition } from 'react';

export type TenantOption = {
    id: string;
    name: string;
};

export type UserFormProps = {
    /**
     * Server action with id already bound:
     * `updateUserAction.bind(null, id)`.
     * Signature after binding: `(formData: FormData) => Promise<void>`.
     *
     * No autosave — users have no drafts. A single "Save" button triggers
     * the write directly.
     */
    saveAction: (formData: FormData) => Promise<void>;
    /**
     * Server action with id already bound:
     * `deleteUserAction.bind(null, id)`.
     * Signature after binding: `() => Promise<void>`.
     */
    deleteAction: () => Promise<void>;
    /**
     * Available tenants for the multi-select, fetched server-side in the page.
     */
    tenantOptions: TenantOption[];
    /**
     * IDs of the tenants currently assigned to this user.
     * Used to set the default selection in the multi-select.
     */
    currentTenantIds: string[];
};

/**
 * Client component that wires Payload's form context to the "Save" and
 * "Delete" buttons for the user edit page.
 *
 * Must be rendered inside Payload's `<Form>` — `useForm()` reads from that
 * context. `<DocumentForm>` renders its `toolbar` slot inside `<Form>`, so
 * placing this component there satisfies that requirement.
 *
 * The tenant multi-select is rendered here (in the toolbar) rather than via
 * `<RenderFields>` because the multi-tenant plugin's field is not a standard
 * Payload field that RenderFields can easily surface. We override the
 * `_payload` blob on submit by merging in the selected tenant IDs.
 */
export function UserForm({ saveAction, deleteAction, tenantOptions, currentTenantIds }: UserFormProps) {
    const { createFormData } = useForm();
    const [isSavePending, startSaveTransition] = useTransition();
    const [isDeletePending, startDeleteTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // Track selected tenant IDs in local state — seeded from currentTenantIds.
    const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>(currentTenantIds);

    const handleSave = () => {
        setErrorMessage(null);
        startSaveTransition(async () => {
            try {
                const formData = await createFormData(undefined, {});

                // Merge tenant selection into _payload: read existing blob,
                // inject `tenants`, re-serialize.
                const existingPayload = formData.get('_payload');
                const base: Record<string, unknown> =
                    existingPayload && typeof existingPayload === 'string'
                        ? (JSON.parse(existingPayload) as Record<string, unknown>)
                        : {};
                base.tenants = selectedTenantIds.map((tenantId) => ({ tenant: tenantId }));
                formData.set('_payload', JSON.stringify(base));

                await saveAction(formData);
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : 'Failed to save user.');
            }
        });
    };

    const handleDelete = () => {
        if (!window.confirm('Delete this user? This cannot be undone.')) {
            return;
        }
        setErrorMessage(null);
        startDeleteTransition(async () => {
            try {
                await deleteAction();
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : 'Failed to delete user.');
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

            {tenantOptions.length > 0 ? (
                <div className="flex flex-col gap-1.5 border-border border-t pt-3">
                    <label htmlFor="user-form-tenants" className="font-medium text-sm">
                        Tenants
                    </label>
                    <select
                        id="user-form-tenants"
                        multiple
                        disabled={isSavePending || isDeletePending}
                        size={Math.min(tenantOptions.length, 6)}
                        value={selectedTenantIds}
                        onChange={(e) => {
                            const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                            setSelectedTenantIds(opts);
                        }}
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

            {errorMessage ? (
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
