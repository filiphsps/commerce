import 'server-only';

import { MissingListConfigError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import type { ReactNode } from 'react';

import type { CollectionEditorManifest } from '../manifest';
import type { EditorRuntime } from '../runtime';

export type EditorListPageProps<TSlug extends CollectionSlug = CollectionSlug> = {
    manifest: CollectionEditorManifest<TSlug>;
    runtime: EditorRuntime;
    params: { domain: string | null };
    searchParams: { page?: string; locale?: string };
    /** Optional client component that holds bulk-selection state. */
    bulkActions?: ReactNode;
};

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
                            className="inline-flex h-9 items-center gap-2 rounded-md border-2 border-primary bg-primary px-4 font-bold text-primary-foreground text-sm uppercase tracking-wide hover:bg-primary/90"
                        >
                            New {manifest.routes.label.singular}
                        </Link>
                    ) : null
                }
            />
            <runtime.Table
                rows={docs as Array<Record<string, unknown> & { id: string | number }>}
                columns={manifest.list.columns}
                getRowHref={(row) => `${manifest.routes.basePath(domain)}${String(row[keyField])}/` as Route}
                bulkActions={bulkActions}
            />
        </>
    );
}
