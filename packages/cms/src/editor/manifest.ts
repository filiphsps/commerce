import type { Route } from 'next';
import type { CollectionSlug } from 'payload';
import type { ReactNode } from 'react';

/**
 * NextAuth-shaped context passed to every editor access predicate.
 * `domain` is null on cross-tenant routes (tenants, users, media list views).
 */
export type EditorAccessCtx = {
    user: {
        id: string;
        email: string;
        role: 'admin' | 'editor';
        tenants: string[];
    } | null;
    domain: string | null;
};

/**
 * Route-level gate. Runs alongside Payload's collection-level access predicates
 * (defense in depth). Return false to `notFound()` from the route.
 */
export type EditorAccess = (ctx: EditorAccessCtx) => boolean | Promise<boolean>;

export type EditorListColumn<TDoc = Record<string, unknown>> = {
    /** Header label. */
    label: string;
    /** Property name on the doc, or a function returning the cell value. */
    accessor: (keyof TDoc & string) | ((doc: TDoc) => string | null);
    /** Optional cell renderer. */
    render?: (value: unknown, doc: TDoc) => ReactNode;
};

/**
 * Editor-route metadata for a single Payload collection.
 *
 * The Payload `CollectionConfig` (looked up at render time via the collection
 * slug) is the source of truth for fields, hooks, collection-level access,
 * drafts/versions/locales. The manifest adds route shape, route-level gates,
 * list shape, live-preview URL, and revalidation paths on top.
 */
export type CollectionEditorManifest<TSlug extends CollectionSlug = CollectionSlug> = {
    /** Payload collection slug. */
    collection: TSlug;

    routes: {
        label: { singular: string; plural: string };
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
        | { kind: 'shared'; readableBy: 'all' | 'admin' }
        | { kind: 'singleton-by-domain' };

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
