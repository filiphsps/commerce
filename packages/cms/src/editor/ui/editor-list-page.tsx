import 'server-only';

import { MissingListConfigError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import type { ReactNode } from 'react';

import type { CollectionEditorManifest } from '../manifest';
import type { EditorRuntime } from '../runtime';

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
 * (redirecting when absent), enforces list access, fetches a paginated doc
 * list, and renders the runtime's `Table` (or `EmptyState` when zero docs).
 *
 * @param props - {@link EditorListPageProps} carrying manifest, runtime, params, and search params.
 * @returns The rendered list page with a page header, optional new-doc link, and table.
 * @throws {MissingListConfigError} When the manifest has no `list` config.
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

    // ── Locale resolution ── (mirrors EditorEditPage)
    const localization = ctx.payload.config.localization !== false ? ctx.payload.config.localization : undefined;
    const tenantDefault = ctx.tenant?.defaultLocale ?? localization?.defaultLocale ?? 'en-US';
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

    const where = manifest.tenant.kind === 'scoped' && ctx.tenant ? { tenant: { equals: ctx.tenant.id } } : undefined;

    const page = Number(searchParams.page) || 1;
    const { docs } = await ctx.payload.find({
        collection: manifest.collection as never,
        where: where as never,
        sort: manifest.list.sortBy ?? '-updatedAt',
        limit: 25,
        page,
        user: ctx.user as never,
        overrideAccess: false,
    });

    const keyField = manifest.routes.keyField ?? 'id';
    return (
        <>
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
            {docs.length === 0 && manifest.list.emptyState ? (
                <runtime.EmptyState
                    label={manifest.list.emptyState.label}
                    description={manifest.list.emptyState.description}
                    actionLabel={manifest.list.emptyState.actionLabel}
                    actionHref={manifest.access.create ? `${manifest.routes.basePath(domain)}new/` : undefined}
                />
            ) : (
                <runtime.Table
                    rows={docs as Array<Record<string, unknown> & { id: string | number }>}
                    columns={manifest.list.columns}
                    getRowHref={(row) => `${manifest.routes.basePath(domain)}${String(row[keyField])}/` as Route}
                    bulkActions={bulkActions}
                />
            )}
        </>
    );
}
