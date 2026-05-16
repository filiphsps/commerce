import 'server-only';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { parseFormPayload, pickByFieldNames } from './form-payload';
import type { CollectionEditorManifest } from './manifest';
import { revalidateForManifest, tenantWhere } from './revalidate';
import type { EditorRuntime } from './runtime';

export type EditorActions = {
    saveDraft: (domain: string | null, id: string, formData: FormData) => Promise<void>;
    publish: (domain: string | null, id: string, formData: FormData) => Promise<void>;
    create: (domain: string | null, formData: FormData) => Promise<{ id: string }>;
    delete: (domain: string | null, id: string) => Promise<void>;
    bulkDelete: (domain: string | null, ids: string[]) => Promise<void>;
    bulkPublish: (domain: string | null, ids: string[]) => Promise<void>;
    restoreVersion: (domain: string | null, id: string, versionId: string) => Promise<void>;
};

/**
 * Factory that builds the seven server-action methods for a manifest.
 *
 * Methods returned here are plain async functions — they MUST be re-exported
 * from a `'use server'` top-level module before being passed across an RSC
 * boundary. `pnpm cms:gen` generates those wrappers; do not call this factory
 * directly inside a component module.
 */
export const createCollectionEditorActions = <T extends CollectionSlug>(
    manifest: CollectionEditorManifest<T>,
    runtime: EditorRuntime,
): EditorActions => {
    const hasDrafts = (collection: { versions?: unknown }): boolean => {
        const v = collection.versions as { drafts?: unknown } | undefined;
        return v !== undefined && v.drafts !== undefined && v.drafts !== false;
    };

    const upsert = async (
        domain: string | null,
        id: string,
        formData: FormData,
        status: 'draft' | 'published',
    ): Promise<void> => {
        const ctx = await runtime.getCtx(domain);
        if (!(await manifest.access.update(runtime.toAccessCtx(ctx, domain)))) notFound();

        const collection = ctx.payload.config.collections.find((c) => c.slug === manifest.collection);
        if (!collection) {
            throw new Error(`[editor] unknown collection slug: ${manifest.collection}`);
        }

        const raw = parseFormPayload(formData);
        const allowed = pickByFieldNames(raw, collection.fields);
        const where = tenantWhere(manifest, ctx.tenant, id);

        const { docs } = await ctx.payload.find({
            collection: manifest.collection as never,
            where,
            limit: 1,
            user: ctx.user as never,
            overrideAccess: false,
        });

        const statusPatch = hasDrafts(collection) ? { _status: status } : {};
        const existing = docs[0];

        let doc: unknown;
        if (existing) {
            doc = await ctx.payload.update({
                collection: manifest.collection as never,
                id: (existing as { id: string }).id,
                data: { ...allowed, ...statusPatch } as never,
                user: ctx.user as never,
                overrideAccess: false,
            });
        } else {
            const tenantPatch = manifest.tenant.kind === 'scoped' && ctx.tenant ? { tenant: ctx.tenant.id } : {};
            doc = await ctx.payload.create({
                collection: manifest.collection as never,
                data: { ...allowed, ...tenantPatch, ...statusPatch } as never,
                user: ctx.user as never,
                overrideAccess: false,
            });
        }

        revalidateForManifest({ manifest, domain, doc, status, revalidatePath });
    };

    return {
        async saveDraft(domain, id, formData) {
            await upsert(domain, id, formData, 'draft');
        },
        async publish(domain, id, formData) {
            await upsert(domain, id, formData, 'published');
        },
        async create(domain, formData) {
            const ctx = await runtime.getCtx(domain);
            const accessCtx = runtime.toAccessCtx(ctx, domain);
            if (!manifest.access.create) notFound();
            if (!(await manifest.access.create(accessCtx))) notFound();

            const collection = ctx.payload.config.collections.find((c) => c.slug === manifest.collection);
            if (!collection) throw new Error(`[editor] unknown collection slug: ${manifest.collection}`);

            const raw = parseFormPayload(formData);
            const allowed = pickByFieldNames(raw, collection.fields);
            const tenantPatch = manifest.tenant.kind === 'scoped' && ctx.tenant ? { tenant: ctx.tenant.id } : {};
            const statusPatch = hasDrafts(collection) ? { _status: 'draft' as const } : {};

            const created = (await ctx.payload.create({
                collection: manifest.collection as never,
                data: { ...allowed, ...tenantPatch, ...statusPatch } as never,
                user: ctx.user as never,
                overrideAccess: false,
            })) as { id: string };

            revalidateForManifest({ manifest, domain, doc: created, status: 'draft', revalidatePath });
            return { id: String(created.id) };
        },
        async delete(domain, id) {
            const ctx = await runtime.getCtx(domain);
            if (!manifest.access.delete) notFound();
            if (!(await manifest.access.delete(runtime.toAccessCtx(ctx, domain)))) notFound();

            await ctx.payload.delete({
                collection: manifest.collection as never,
                id,
                user: ctx.user as never,
                overrideAccess: false,
            });

            revalidateForManifest({ manifest, domain, doc: { id }, status: 'published', revalidatePath });
        },
        async bulkDelete(domain, ids) {
            const ctx = await runtime.getCtx(domain);
            if (!manifest.access.delete) notFound();
            if (!(await manifest.access.delete(runtime.toAccessCtx(ctx, domain)))) notFound();

            for (const id of ids) {
                await ctx.payload.delete({
                    collection: manifest.collection as never,
                    id,
                    user: ctx.user as never,
                    overrideAccess: false,
                });
            }
            revalidateForManifest({ manifest, domain, doc: { ids }, status: 'published', revalidatePath });
        },
        async bulkPublish(domain, ids) {
            const ctx = await runtime.getCtx(domain);
            if (!(await manifest.access.update(runtime.toAccessCtx(ctx, domain)))) notFound();

            for (const id of ids) {
                await ctx.payload.update({
                    collection: manifest.collection as never,
                    id,
                    data: { _status: 'published' } as never,
                    user: ctx.user as never,
                    overrideAccess: false,
                });
            }
            revalidateForManifest({ manifest, domain, doc: { ids }, status: 'published', revalidatePath });
        },
        async restoreVersion(domain, id, versionId) {
            const ctx = await runtime.getCtx(domain);
            if (!(await manifest.access.update(runtime.toAccessCtx(ctx, domain)))) notFound();

            await ctx.payload.restoreVersion({
                collection: manifest.collection as never,
                id: versionId,
                user: ctx.user as never,
                overrideAccess: false,
            });

            revalidateForManifest({ manifest, domain, doc: { id }, status: 'draft', revalidatePath });
        },
    };
};
