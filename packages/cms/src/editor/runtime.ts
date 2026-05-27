import type { Route } from 'next';
import type { FormState, Payload, PayloadRequest } from 'payload';
import type { ComponentType, ReactNode } from 'react';
import type { PayloadFieldShellProps } from '../ui';
import type { CollectionEditorManifest, EditorAccessCtx, EditorListColumn } from './manifest';

/**
 * Authenticated user as the editor primitives see it. Mirrors the shape the
 * admin app's `getAuthedPayloadCtx` returns.
 *
 * @example
 * const user: AuthedUser = ctx.user;
 * const isMember = user.tenants.some((t) => t.tenant === tenantId);
 */
export type AuthedUser = {
    id: string;
    email: string;
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: string }>;
    collection: 'users';
};

/**
 * Resolved Payload context including the authenticated user and tenant after
 * the admin app's `getAuthedPayloadCtx` call. Passed to every editor
 * primitive as the first argument to `runtime.toAccessCtx`.
 *
 * @example
 * const ctx: AuthedPayloadCtx = await runtime.getCtx(domain);
 * const allowed = await manifest.access.read(runtime.toAccessCtx(ctx, domain));
 */
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

/**
 * Arguments consumed by `EditorRuntime.buildFormState`. Drives Payload's
 * `buildFormState` call that converts a raw doc into the `FormState` shape
 * the `<Form>` component reads.
 *
 * @example
 * const { state } = await runtime.buildFormState({
 *     collectionSlug: 'pages',
 *     data: doc,
 *     operation: 'update',
 *     docPermissions: { create: true, fields: true, read: true, update: true },
 *     docPreferences: { fields: {} },
 *     req,
 *     schemaPath: 'pages',
 * });
 */
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
 *
 * @example
 * const shellProps: ShellProps = await runtime.getShellProps(domain, locale);
 */
export type ShellProps = Omit<PayloadFieldShellProps, 'children'>;

/**
 * Props the runtime's `DocumentForm` shell receives. Carries the resolved
 * form state, breadcrumb trail, optional live-preview slot, and bound
 * server-action callbacks so the shell stays decoupled from the collection
 * being edited.
 *
 * @example
 * <runtime.DocumentForm title={title} shellProps={shellProps} onSubmit={saveDraft}>
 *     <EditorFields collection="pages" />
 * </runtime.DocumentForm>
 */
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

/**
 * Props the runtime's `Table` component receives. Carries pre-fetched rows,
 * column descriptors, a row href builder, and an optional bulk-actions slot so
 * the shell remains collection-agnostic.
 *
 * @example
 * <runtime.Table rows={docs} columns={columns} getRowHref={(row) => `/admin/pages/${row.id}/`} />
 */
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

/**
 * Props the runtime's `Toolbar` component receives. Drives the save-draft /
 * publish action buttons, autosave indicator, and last-saved timestamp so the
 * shell renders the toolbar without knowledge of the specific collection.
 *
 * @example
 * <runtime.Toolbar saveDraftAction={saveDraft} publishAction={publish} isSaving={false} lastSavedAt={null} hasDrafts={true} />
 */
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
 *
 * @example
 * // In a Next.js route component:
 * <EditorListPage manifest={pagesEditor} runtime={editorRuntime} domain={domain} />
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

/**
 * Convenience intersection that adds `manifest` and `runtime` to any editor
 * primitive's own props, reducing boilerplate in consumer components.
 *
 * @example
 * function MyEditorPage({ manifest, runtime, id }: WithRuntime<{ id: string }>) {}
 */
export type WithRuntime<TProps> = TProps & {
    manifest: CollectionEditorManifest;
    runtime: EditorRuntime;
};
