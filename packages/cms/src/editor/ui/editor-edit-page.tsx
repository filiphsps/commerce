import 'server-only';

import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import type { ReactNode } from 'react';
import type { EditorActions } from '../actions';
import type { CollectionEditorManifest } from '../manifest';
import { tenantWhere } from '../revalidate';
import type { EditorRuntime } from '../runtime';
import { EditorFields } from './editor-fields';
import { EditorFormToolbar } from './editor-form-toolbar';

export type EditorEditPageProps<TSlug extends CollectionSlug = CollectionSlug> = {
    manifest: CollectionEditorManifest<TSlug>;
    runtime: EditorRuntime;
    params: { domain: string | null; id: string };
    searchParams: { locale?: string };
    /**
     * The codegen'd `'use server'` action wrappers for this manifest.
     * Pre-bound via `.bind(null, domain, id)` inside the page; their job is
     * to cross the RSC boundary as transferable action IDs.
     */
    generatedActions: EditorActions;
    /** Optional live-preview slot. Manifest's `livePreview` builder runs upstream
     *  (in the route file) so this component takes the rendered element. */
    livePreview?: ReactNode;
};

export async function EditorEditPage<TSlug extends CollectionSlug>({
    manifest,
    runtime,
    params,
    searchParams,
    generatedActions,
    livePreview,
}: EditorEditPageProps<TSlug>): Promise<ReactNode> {
    const { domain, id } = params;
    const ctx = await runtime.getCtx(domain);
    if (!(await manifest.access.read(runtime.toAccessCtx(ctx, domain)))) notFound();

    const collection = ctx.payload.config.collections.find((c) => c.slug === manifest.collection);

    // Locale resolution.
    const localization = ctx.payload.config.localization !== false ? ctx.payload.config.localization : undefined;
    const defaultLocale = localization?.defaultLocale ?? 'en-US';
    const locale = searchParams.locale ?? defaultLocale;

    // Detect drafts support from the collection config when available.
    const hasDrafts =
        collection !== undefined &&
        collection.versions !== undefined &&
        (collection.versions as { drafts?: unknown }).drafts !== undefined &&
        (collection.versions as { drafts?: unknown }).drafts !== false;

    const where = tenantWhere(manifest, ctx.tenant, id);
    const { docs } = await ctx.payload.find({
        collection: manifest.collection as never,
        where,
        limit: 1,
        locale: locale as never,
        user: ctx.user as never,
        overrideAccess: false,
        draft: hasDrafts,
    });
    const existing = docs[0] ?? null;

    // Build form state.
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: ctx.payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: ctx.payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: ctx.user as never } }, ctx.payload);

    const { state: initialState } = await runtime.buildFormState({
        collectionSlug: String(manifest.collection),
        data: (existing as unknown as Record<string, unknown>) ?? {},
        id: existing ? String((existing as unknown as { id: string }).id) : undefined,
        operation: existing ? 'update' : 'create',
        docPermissions: { create: true, fields: true, read: true, readVersions: hasDrafts, update: true },
        docPreferences: { fields: {} },
        locale,
        req,
        schemaPath: String(manifest.collection),
        skipValidation: true,
    });

    const clientConfig = await runtime.getClientConfig(domain);

    // Bind the codegen'd action wrappers to (domain, id).
    const boundSaveDraft = (formData: FormData) => generatedActions.saveDraft(domain, id, formData);
    const boundPublish = (formData: FormData) => generatedActions.publish(domain, id, formData);

    const existingName = (existing as unknown as { name?: string } | null)?.name;
    const title = existingName ? String(existingName) : manifest.routes.label.singular;

    const breadcrumbs = manifest.routes.breadcrumbs?.({ domain }) ?? [];

    const autosave =
        hasDrafts && collection !== undefined
            ? (collection.versions as { drafts: { autosave?: { interval: number } } }).drafts.autosave
            : undefined;

    return (
        <runtime.DocumentForm
            title={title}
            breadcrumbs={breadcrumbs}
            clientConfig={clientConfig}
            onSubmit={boundSaveDraft}
            initialState={initialState}
            toolbar={
                <EditorFormToolbar
                    Toolbar={runtime.Toolbar}
                    saveDraftAction={boundSaveDraft}
                    publishAction={boundPublish}
                    autosave={autosave}
                />
            }
            livePreview={livePreview}
        >
            <EditorFields collection={String(manifest.collection)} />
        </runtime.DocumentForm>
    );
}
