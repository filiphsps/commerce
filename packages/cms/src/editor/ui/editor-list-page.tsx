import 'server-only';

import { notFound } from 'next/navigation';
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
        throw new Error(`[editor] manifest ${manifest.collection} has no list config; cannot render <EditorListPage>`);
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
        <runtime.Table
            rows={docs as Array<Record<string, unknown>>}
            columns={manifest.list.columns}
            getRowHref={(row) => `${manifest.routes.basePath(domain)}${String(row[keyField])}/`}
            bulkActions={bulkActions}
        />
    );
}
