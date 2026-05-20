import type { Route } from 'next';
import type { FormState, Payload, PayloadRequest } from 'payload';
import type { ComponentType, ReactNode } from 'react';
import type { PayloadFieldShellProps } from '../ui';
import type { CollectionEditorManifest, EditorAccessCtx, EditorListColumn } from './manifest';

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
    tenant: {
        id: string;
        slug: string;
        name?: string;
        /** Shop's default locale (BCP-47). Always present when tenant is non-null. */
        defaultLocale: string;
        /** Allowed locales for this tenant. Always non-empty when tenant is non-null. */
        locales: string[];
    } | null;
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

/**
 * Full prop bag the admin's `<DocumentForm>` forwards to `<PayloadFieldShell>`.
 * Built per render by `EditorRuntime.getShellProps`. Excludes `children` —
 * those are supplied at the `<DocumentForm>` render site.
 */
export type ShellProps = Omit<PayloadFieldShellProps, 'children'>;

/** Props the runtime's `DocumentForm` shell receives. */
export type DocumentFormShellProps = {
    title: string;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    shellProps: ShellProps;
    onSubmit: (formData: FormData) => Promise<void>;
    initialState?: FormState;
    toolbar?: ReactNode;
    livePreview?: ReactNode;
    children: ReactNode;
};

/** Props the runtime's `Table` component receives. */
export type CollectionTableShellProps = {
    /**
     * Payload always populates `id` on a returned doc, and the table uses it
     * for row keys and aria labels — encode that in the type so consumers
     * can't accidentally drop it.
     */
    rows: Array<Record<string, unknown> & { id: string | number }>;
    columns: Array<EditorListColumn>;
    getRowHref: (row: Record<string, unknown> & { id: string | number }) => Route;
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
    /**
     * Returns the full shell prop bag the admin's `<DocumentForm>` expects.
     * The admin builds it via its own `getCmsShellProps(domain)` helper, which
     * internally calls `getClientConfig`, resolves the theme, language options,
     * permissions, and so on. Editor primitives forward the result opaquely.
     */
    getShellProps: (domain: string | null, locale?: string) => Promise<ShellProps>;
    DocumentForm: ComponentType<DocumentFormShellProps>;
    /** Render the empty-state for a list. The list page passes label/action props.
     *  The admin app wires this to `<EmptyState>` from its shell. */
    EmptyState: ComponentType<{
        label: string;
        description?: string;
        actionLabel?: string;
        actionHref?: string;
    }>;
    Table: ComponentType<CollectionTableShellProps>;
    Toolbar: ComponentType<EditorToolbarShellProps>;
    PageHeader: ComponentType<{
        title: string;
        breadcrumbs?: Array<{ label: string; href?: string }>;
        actions?: ReactNode;
    }>;
};

/** Convenience type for primitive props that pair manifest + runtime. */
export type WithRuntime<TProps> = TProps & {
    manifest: CollectionEditorManifest;
    runtime: EditorRuntime;
};
