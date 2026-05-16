import type { ClientConfig, FormState, Payload, PayloadRequest } from 'payload';
import type { ComponentType, ReactNode } from 'react';
import type { CollectionEditorManifest, EditorAccessCtx } from './manifest';

/**
 * Authenticated user as the editor primitives see it. Mirrors the shape the
 * admin app's `getAuthedPayloadCtx` returns.
 */
export type AuthedUser = {
    id: string;
    email: string;
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: string }>;
    collection: 'users';
};

export type AuthedPayloadCtx = {
    payload: Payload;
    user: AuthedUser;
    tenant: { id: string; slug: string; name?: string } | null;
};

export type BuildFormStateArgs = {
    collectionSlug: string;
    data: Record<string, unknown>;
    id?: string;
    operation: 'create' | 'update';
    docPermissions: {
        create: boolean;
        fields: true;
        read: boolean;
        readVersions?: boolean;
        update: boolean;
    };
    docPreferences: { fields: Record<string, unknown> };
    locale?: string;
    req: PayloadRequest;
    schemaPath: string;
    skipValidation?: boolean;
};

/** Props the runtime's `DocumentForm` shell receives. */
export type DocumentFormShellProps = {
    title: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    clientConfig: ClientConfig;
    onSubmit: (formData: FormData) => Promise<void>;
    initialState?: FormState;
    toolbar?: ReactNode;
    livePreview?: ReactNode;
    children: ReactNode;
};

/** Props the runtime's `Table` component receives. */
export type CollectionTableShellProps = {
    rows: Array<Record<string, unknown>>;
    columns: Array<{
        label: string;
        accessor: string | ((row: Record<string, unknown>) => string | null);
    }>;
    getRowHref: (row: Record<string, unknown>) => string;
    bulkActions?: ReactNode;
};

/** Props the runtime's `Toolbar` component receives. */
export type EditorToolbarShellProps = {
    saveDraftAction: () => Promise<void>;
    publishAction: () => Promise<void>;
    isSaving: boolean;
    lastSavedAt: Date | null;
    hasDrafts: boolean;
};

/**
 * Per-render dependency bundle the admin app supplies to every editor
 * primitive. Built once at app boot in `apps/admin/src/lib/editor-runtime.ts`.
 */
export type EditorRuntime = {
    getCtx: (domain: string | null) => Promise<AuthedPayloadCtx>;
    toAccessCtx: (ctx: AuthedPayloadCtx, domain: string | null) => EditorAccessCtx;
    buildFormState: (args: BuildFormStateArgs) => Promise<{ state: FormState }>;
    getClientConfig: (domain: string | null) => Promise<ClientConfig>;
    DocumentForm: ComponentType<DocumentFormShellProps>;
    Table: ComponentType<CollectionTableShellProps>;
    Toolbar: ComponentType<EditorToolbarShellProps>;
};

/** Convenience type for primitive props that pair manifest + runtime. */
export type WithRuntime<TProps> = TProps & {
    manifest: CollectionEditorManifest;
    runtime: EditorRuntime;
};
