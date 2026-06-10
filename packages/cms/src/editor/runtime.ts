import type { Route } from 'next';
import type { Payload } from 'payload';
import type { ComponentType, ReactNode } from 'react';
import type { FormState } from './form/types';
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
 * Resolved auth context including the authenticated user and tenant after the
 * admin app's `getAuthedPayloadCtx` call. Passed to every editor primitive as
 * the first argument to `runtime.toAccessCtx`.
 *
 * `payload` is the LAST Payload-typed handle on the runtime seam. Since the
 * CMSDATA-07 shell rebind the editor pages neither read documents nor the
 * collection config through it — reads go through the bridge's
 * `list`/`getDocument`/`listVersions` and the field schemas come from
 * `collection-fields.ts`. It survives only for the admin's legacy-Payload
 * surfaces (the shell-prop adapter and the theme editor's field widgets) until
 * TEARDOWN removes them.
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
 * Arguments consumed by `EditorRuntime.buildFormState` — the native CMSFORM-01
 * replacement for Payload's `buildFormState` argument bag. The runtime derives
 * the dotted-path {@link FormState} from `data` alone; the schema-driven extras
 * Payload required (permissions, preferences, a `PayloadRequest`) are gone.
 *
 * @example
 * const { state } = await runtime.buildFormState({
 *     collectionSlug: 'pages',
 *     data: doc,
 *     id: doc.id,
 *     operation: 'update',
 *     locale: 'en-US',
 * });
 */
export type BuildFormStateArgs = {
    collectionSlug: string;
    data: Record<string, unknown>;
    id?: string;
    operation: 'create' | 'update';
    locale?: string;
};

/**
 * Opaque prop bag the admin's `<DocumentForm>` shell consumes. Built per render
 * by `EditorRuntime.getShellProps` and forwarded UNTOUCHED by every editor
 * primitive — the runtime seam deliberately knows nothing about its members so
 * the admin can keep serving the legacy Payload-shaped providers to
 * not-yet-rebuilt shells until CMSDATA-07 deletes them.
 *
 * @example
 * const shellProps: ShellProps = await runtime.getShellProps(domain, locale);
 */
export type ShellProps = Record<string, unknown>;

/**
 * Document-addressing target the bridge forwards to Convex's `cms/actions.ts` save mutations: a
 * literal `cmsDocuments` id, a content-key pair (`keyField`/`keyValue`) for keyField-routed
 * collections, or nothing for tenant singletons (server-side singleton upsert).
 */
export type EditorDocumentTarget = {
    documentId?: string;
    keyField?: string;
    keyValue?: string;
};

/**
 * One live CMS document as the editor shell reads it through the bridge — the projection of a
 * Convex `cmsDocuments` row with the isolate-private members (`_id`, `shopId`) collapsed into the
 * public `documentId`/timestamps the pages bind to.
 */
export type EditorCmsDocument = {
    /** The live `cmsDocuments` id, as a string. */
    documentId: string;
    /** The document's collection slug. */
    collection: string;
    /** The serialized field map the editor seeds its form state from. */
    data: Record<string, unknown>;
    /** The live row's draft/published status. */
    status: 'draft' | 'published';
    /** Last-save epoch-ms timestamp. */
    updatedAt: number;
    /** The most recent version snapshot's id, when one exists. */
    latestVersionId?: string;
};

/**
 * One page of an editor list read — the bridge projection of Convex `cms/list.ts`'s `CmsListPage`,
 * carrying the page's documents plus the addressing metadata the list view binds to.
 */
export type EditorCmsListPage = {
    docs: EditorCmsDocument[];
    /** The 1-based page index actually served. */
    page: number;
    /** The page size in force. */
    pageSize: number;
    /** Total live documents for the tenant/collection. */
    totalDocs: number;
    /** Last addressable page, at least 1. */
    totalPages: number;
};

/**
 * One version snapshot as the versions page reads it through the bridge — the projection of a
 * Convex `cmsVersions` row.
 */
export type EditorCmsVersion = {
    /** The `cmsVersions` id, as a string — what `restoreVersion` re-materializes. */
    versionId: string;
    /** The snapshot's draft/published status at save time. */
    status: 'draft' | 'published';
    /** The snapshot's creation epoch-ms timestamp. */
    createdAt: number;
};

/**
 * The Convex transport the editor server actions post through — the same injected-callback seam as
 * the CMSFORM-05 autosave `save` prop, lifted to all seven operations. The admin app binds each
 * method to the matching `cms/actions.ts` mutation over a `ConvexHttpClient` authenticated with the
 * operator's CONVEXCORE-14/16 bearer token, so the Convex side resolves the tenant and enforces
 * access from the trusted identity; nothing in this contract lets the client pick a tenant or relax
 * enforcement (there is no `overrideAccess`).
 *
 * The three read methods (`list`/`getDocument`/`listVersions`) are the CMSDATA-07 shell-read seam:
 * they bind to the tenant-tier `cms/list:list`, `cms/documents:get`, and `cms/versions:list`
 * queries, replacing the editor pages' `payload.find`/`payload.findVersions` reads.
 *
 * `locale` rides along on the save-shaped calls for the CMSDATA-10 localized write seam. The
 * CMSDATA-06 admin transport deliberately does NOT forward it to the `cms/actions.ts` mutations —
 * they accept no `locale` argument yet and treat `data` as the already-serialized field map.
 * CMSDATA-10 is the consuming task: it adds the localized field-bucket routing and starts reading
 * this value.
 */
export type EditorConvexBridge = {
    saveDraft: (
        args: { collection: string; data: Record<string, unknown>; locale: string } & EditorDocumentTarget,
    ) => Promise<{ documentId: string }>;
    publish: (
        args: { collection: string; data: Record<string, unknown>; locale: string } & EditorDocumentTarget,
    ) => Promise<{ documentId: string }>;
    create: (args: { collection: string; data: Record<string, unknown>; locale: string }) => Promise<{
        documentId: string;
    }>;
    deleteDocument: (args: { documentId: string }) => Promise<void>;
    bulkDelete: (args: { documentIds: string[] }) => Promise<void>;
    bulkPublish: (args: { documentIds: string[] }) => Promise<void>;
    restoreVersion: (args: { versionId: string }) => Promise<void>;
    /** Page-bounded tenant list over a collection's live documents (`cms/list:list`). */
    list: (args: { collection: string; page?: number; pageSize?: number }) => Promise<EditorCmsListPage>;
    /** Read one live document by id/key/singleton target (`cms/documents:get`); `null` when absent. */
    getDocument: (args: { collection: string } & EditorDocumentTarget) => Promise<EditorCmsDocument | null>;
    /** A live document's version history, oldest first (`cms/versions:list`). */
    listVersions: (args: { documentId: string }) => Promise<EditorCmsVersion[]>;
};

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
     * Every persisted doc carries a public `id`, and the table uses it for row
     * keys and aria labels — encode that in the type so consumers can't
     * accidentally drop it.
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
 * primitive. Built once at app boot in `apps/admin/src/lib/editor-runtime.tsx`.
 *
 * @example
 * // In a Next.js route component:
 * <EditorListPage manifest={pagesEditor} runtime={editorRuntime} domain={domain} />
 */
export type EditorRuntime = {
    getCtx: (domain: string | null) => Promise<AuthedPayloadCtx>;
    toAccessCtx: (ctx: AuthedPayloadCtx, domain: string | null) => EditorAccessCtx;
    /**
     * Resolve the native {@link FormState} that seeds the CMSFORM-01 `<Form>`
     * for a document — the Payload `buildFormState` replacement.
     */
    buildFormState: (args: BuildFormStateArgs) => Promise<{ state: FormState }>;
    /**
     * Returns the full shell prop bag the admin's `<DocumentForm>` expects.
     * The admin builds it via its own `getCmsShellProps(domain)` helper;
     * editor primitives forward the result opaquely.
     */
    getShellProps: (domain: string | null, locale?: string) => Promise<ShellProps>;
    /**
     * The CMSDATA-05 Convex write transport. Optional only so test substrates
     * can omit it; `createCollectionEditorActions` fails loud
     * (`MissingConvexBridgeError`) when an action runs without one.
     */
    convex?: EditorConvexBridge;
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
