import type { Route } from 'next';
import type { ReactNode } from 'react';

/**
 * Every collection slug the editor can address. Replaces the Payload-generated
 * `CollectionSlug` union (TEARDOWN-02): the members are the CMS content
 * collections plus the platform surfaces with editor manifests, and the legacy
 * `tenants` slug whose routes render an empty surface (see
 * `legacy-tenants-slug.ts`). Adding a manifest for a new collection starts
 * here — an unknown slug fails the manifest's `defineCollectionEditor` call at
 * compile time.
 */
export type CollectionSlug =
    | 'users'
    | 'media'
    | 'shops'
    | 'feature-flags'
    | 'pages'
    | 'articles'
    | 'productMetadata'
    | 'collectionMetadata'
    | 'reviews'
    | 'header'
    | 'footer'
    | 'search'
    | 'businessData'
    | 'tenants';

/**
 * NextAuth-shaped context passed to every editor access predicate.
 * `domain` is null on cross-tenant routes (tenants, users, media list views).
 * `tenantId` is the resolved tenant document id for the URL `domain`, or
 * null when the route operates cross-tenant. Predicates that need to verify
 * tenant membership should compare against this — `user.tenants` carries
 * the same id shape (tenant document ids), not domain strings.
 *
 * @example
 * const canAccess: EditorAccess = ({ user, tenantId }) =>
 *   user?.role === 'admin' || (tenantId !== null && (user?.tenants.includes(tenantId) ?? false));
 */
export type EditorAccessCtx = {
    user: {
        id: string;
        email: string;
        role: 'admin' | 'editor';
        /** Tenant document ids the user belongs to. */
        tenants: string[];
    } | null;
    domain: string | null;
    tenantId: string | null;
};

/**
 * Route-level gate. Runs alongside the Convex functions' own server-side access
 * enforcement (defense in depth). Return false to `notFound()` from the route.
 *
 * @example
 * const listAccess: EditorAccess = ({ user }) => user?.role === 'admin';
 */
export type EditorAccess = (ctx: EditorAccessCtx) => boolean | Promise<boolean>;

/**
 * Column descriptor for the editor list-view table. Maps a doc field (or a
 * computed accessor) to a header label, with an optional cell renderer for
 * custom formatting.
 *
 * @example
 * const col: EditorListColumn = { label: 'Title', accessor: 'title' };
 * const computed: EditorListColumn = { label: 'Status', accessor: (doc) => doc.status ?? '-' };
 */
export type EditorListColumn<TDoc = Record<string, unknown>> = {
    /** Header label. */
    label: string;
    /** Property name on the doc, or a function returning the cell value. */
    accessor: (keyof TDoc & string) | ((doc: TDoc) => string | null);
    /** Optional cell renderer. */
    render?: (value: unknown, doc: TDoc) => ReactNode;
};

/**
 * Editor-route metadata for a single CMS collection.
 *
 * The editor schema (`editorCollectionSchema`, looked up at render time via
 * the collection slug) is the source of truth for fields and draft behavior.
 * The manifest adds route shape, route-level gates, list shape, live-preview
 * URL, and revalidation paths on top.
 *
 * @example
 * // Build manifests with {@link defineCollectionEditor}:
 * const manifest: CollectionEditorManifest = defineCollectionEditor({ collection: 'pages', ... });
 */
export type CollectionEditorManifest<TSlug extends CollectionSlug = CollectionSlug> = {
    /** Collection slug. */
    collection: TSlug;

    routes: {
        label: { singular: string; plural: string };
        /**
         * Admin-facing one-line summary of what this surface edits, rendered on
         * the content overview's navigation cards. Singletons (globals) should
         * set this so the dynamically-derived card carries a description.
         */
        description?: string;
        /** Base path for the list view. `domain` is null on cross-tenant routes. */
        basePath: (domain: string | null) => Route;
        /** Breadcrumb trail for the edit/list/new pages. */
        breadcrumbs?: (ctx: { domain: string | null }) => Array<{ label: string; href?: Route }>;
        /**
         * URL segment field — overrides the default `id`. e.g. productMetadata
         * uses `shopifyHandle`.
         */
        keyField?: 'id' | (string & {});
    };

    tenant:
        | { kind: 'scoped'; field: 'tenant' }
        | { kind: 'tenant-singleton'; field: 'tenant' }
        | { kind: 'singleton-by-domain' }
        | { kind: 'shared'; readableBy: 'all' | 'admin' };

    access: {
        list: EditorAccess;
        read: EditorAccess;
        create?: EditorAccess;
        update: EditorAccess;
        delete?: EditorAccess;
    };

    /** Omit to skip list/bulk affordances entirely (e.g. globals). */
    list?: {
        columns: EditorListColumn[];
        /** Default '-updatedAt'. */
        sortBy?: string;
        bulkActions?: Array<'delete' | 'publish'>;
        /** Empty-state copy used when the list returns zero docs. */
        emptyState?: {
            label: string;
            description?: string;
            actionLabel?: string;
        };
    };

    /** Omit to hide the preview iframe slot. */
    livePreview?: (ctx: { tenantId: string; collection: string; data: unknown; locale: string }) => string;

    /** Paths to revalidate after every successful write. */
    revalidate?: (ctx: { domain: string | null; doc: unknown; status: 'draft' | 'published' }) => string[];
};

/**
 * Identity helper that gives the manifest the right type without `as const`.
 * @example
 * export const businessDataEditor = defineCollectionEditor({
 *     collection: 'businessData',
 *     routes: { ... },
 *     tenant: { kind: 'scoped', field: 'tenant' },
 *     access: { ... },
 * });
 */
export const defineCollectionEditor = <T extends CollectionSlug>(
    m: CollectionEditorManifest<T>,
): CollectionEditorManifest<T> => m;
