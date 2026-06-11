import 'server-only';

import { MissingConvexBridgeError, MissingListConfigError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { bridgeErrorCode, EditorBridgeErrorCode } from '../bridge-errors';
import type { CollectionEditorManifest, CollectionSlug } from '../manifest';
import type { EditorCmsListPage, EditorRuntime } from '../runtime';

/**
 * Props for {@link EditorListPage}.
 *
 * @example
 * <EditorListPage manifest={pagesEditor} runtime={runtime} params={{ domain }} searchParams={searchParams} />
 */
export type EditorListPageProps<TSlug extends CollectionSlug = CollectionSlug> = {
    manifest: CollectionEditorManifest<TSlug>;
    runtime: EditorRuntime;
    params: { domain: string | null };
    searchParams: { page?: string; locale?: string };
    /** Optional client component that holds bulk-selection state. */
    bulkActions?: ReactNode;
};

/**
 * Server Component that renders the collection list view. Resolves the locale
 * (redirecting when absent), enforces list access, fetches one page through
 * the bridge's bounded Convex list (`cms/list:list` — CMSDATA-11), surfaces
 * the aggregate `totalDocs` count, and renders the runtime's `Table` (or
 * `EmptyState` when zero docs). Multi-page collections get a pager (previous/
 * next links addressing the bounded read's 1-based `page` param, other search
 * params preserved) with a friendly end-of-list marker on the last page. Two
 * typed refusals from the bounded read map to UI states instead of crashes: a
 * page past the last addressable page is refused with `notFound()`, and a
 * tenant whose collection crosses the scan budget gets a friendly bounded-list
 * notice.
 *
 * @param props - {@link EditorListPageProps} carrying manifest, runtime, params, and search params.
 * @returns The rendered list page with a page header, document count, optional new-doc link, and table.
 * @throws {MissingListConfigError} When the manifest has no `list` config.
 * @throws {MissingConvexBridgeError} When the runtime carries no Convex bridge.
 */
export async function EditorListPage<TSlug extends CollectionSlug>({
    manifest,
    runtime,
    params,
    searchParams,
    bulkActions,
}: EditorListPageProps<TSlug>): Promise<ReactNode> {
    const { domain } = params;
    const ctx = await runtime.getCtx(domain);
    if (!(await manifest.access.list(runtime.toAccessCtx(ctx, domain)))) notFound();
    if (!manifest.list) {
        throw new MissingListConfigError(manifest.collection);
    }
    if (!runtime.convex) {
        throw new MissingConvexBridgeError(manifest.collection);
    }

    // ── Locale resolution ── (mirrors EditorEditPage)
    const tenantDefault = ctx.tenant?.defaultLocale ?? 'en-US';
    const allowed = ctx.tenant?.locales ?? [tenantDefault];
    const requested = searchParams.locale;
    const valid = typeof requested === 'string' && allowed.includes(requested);

    if (!valid) {
        const next = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            if (key !== 'locale' && typeof value === 'string') next.set(key, value);
        }
        next.set('locale', tenantDefault);
        const base = manifest.routes.basePath(domain);
        redirect(`${base}?${next.toString()}` as Route);
    }

    const page = Number(searchParams.page) || 1;

    let result: EditorCmsListPage | null = null;
    let scanExceeded = false;
    try {
        result = await runtime.convex.list({ collection: String(manifest.collection), page });
    } catch (error) {
        const code = bridgeErrorCode(error);
        // The UI counterparts of the bounded list's typed refusals: a page past
        // the last addressable page reads as missing, and a budget-crossing
        // tenant gets a notice instead of a leaked engine error.
        if (code === EditorBridgeErrorCode.PAGE_OUT_OF_RANGE) notFound();
        if (code !== EditorBridgeErrorCode.BOUNDED_SCAN_EXCEEDED) throw error;
        scanExceeded = true;
    }

    const header = (
        <runtime.PageHeader
            title={manifest.routes.label.plural}
            breadcrumbs={manifest.routes.breadcrumbs?.({ domain }) ?? []}
            actions={
                manifest.access.create ? (
                    <Link
                        href={`${manifest.routes.basePath(domain)}new/` as Route}
                        // Inline primary-button classes: this cms package cannot
                        // import the admin app's `<Button>` (cross-boundary). When
                        // we move the action slot into the runtime, this string
                        // can collapse into `runtime.Button` or equivalent.
                        className="inline-flex h-9 items-center gap-2 rounded-md border-2 border-primary bg-primary px-4 font-bold text-primary-foreground text-sm uppercase tracking-wide hover:bg-primary/90"
                    >
                        New {manifest.routes.label.singular}
                    </Link>
                ) : null
            }
        />
    );

    if (scanExceeded || result === null) {
        return (
            <>
                {header}
                <p role="alert" data-testid="bounded-list-notice" className="text-muted-foreground text-sm">
                    This collection is too large to list safely right now. Open a document directly via its URL, or
                    contact support to prune the collection.
                </p>
            </>
        );
    }

    // Project the bridge documents into table rows: the serialized field map
    // becomes the cell source, with the live id/status/timestamp layered on
    // top so column accessors like `updatedAt` and `_status` keep resolving.
    const rows = result.docs.map((doc) => ({
        ...doc.data,
        id: doc.documentId,
        _status: doc.status,
        updatedAt: new Date(doc.updatedAt).toISOString(),
    }));

    /**
     * Builds the href that addresses another page of this list, preserving every other search
     * param (locale included) so paging never drops the resolved locale back into the redirect.
     *
     * @param target - The 1-based page to address.
     * @returns The list route with the page param applied.
     */
    const pageHref = (target: number): Route => {
        const next = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            if (key !== 'page' && typeof value === 'string') next.set(key, value);
        }
        next.set('page', String(target));
        return `${manifest.routes.basePath(domain)}?${next.toString()}` as Route;
    };

    const pager =
        result.totalPages > 1 ? (
            <nav aria-label="Pagination" data-testid="list-pager" className="flex items-center gap-4 text-sm">
                {result.page > 1 ? (
                    <Link href={pageHref(result.page - 1)} className="text-primary hover:underline">
                        Previous
                    </Link>
                ) : null}
                <span className="text-muted-foreground">
                    Page {result.page} of {result.totalPages}
                </span>
                {result.page < result.totalPages ? (
                    <Link href={pageHref(result.page + 1)} className="text-primary hover:underline">
                        Next
                    </Link>
                ) : (
                    <span data-testid="end-of-list" className="text-muted-foreground">
                        End of list
                    </span>
                )}
            </nav>
        ) : null;

    const keyField = manifest.routes.keyField ?? 'id';
    return (
        <>
            {header}
            <p className="text-muted-foreground text-sm">
                {result.totalDocs}{' '}
                {result.totalDocs === 1 ? manifest.routes.label.singular : manifest.routes.label.plural}
            </p>
            {rows.length === 0 && manifest.list.emptyState ? (
                <runtime.EmptyState
                    label={manifest.list.emptyState.label}
                    description={manifest.list.emptyState.description}
                    actionLabel={manifest.list.emptyState.actionLabel}
                    actionHref={manifest.access.create ? `${manifest.routes.basePath(domain)}new/` : undefined}
                />
            ) : (
                <runtime.Table
                    rows={rows}
                    columns={manifest.list.columns}
                    getRowHref={(row) => `${manifest.routes.basePath(domain)}${String(row[keyField])}/` as Route}
                    bulkActions={bulkActions}
                />
            )}
            {pager}
        </>
    );
}
