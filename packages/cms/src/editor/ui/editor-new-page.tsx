import 'server-only';

import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import type { ReactNode } from 'react';
import type { EditorActions } from '../actions';
import type { CollectionEditorManifest } from '../manifest';
import type { EditorRuntime } from '../runtime';
import { EditorFields } from './editor-fields';
import { EditorFormToolbar } from './editor-form-toolbar';

export type EditorNewPageProps<TSlug extends CollectionSlug = CollectionSlug> = {
    manifest: CollectionEditorManifest<TSlug>;
    runtime: EditorRuntime;
    params: { domain: string | null };
    generatedActions: EditorActions;
};

export async function EditorNewPage<TSlug extends CollectionSlug>({
    manifest,
    runtime,
    params,
    generatedActions,
}: EditorNewPageProps<TSlug>): Promise<ReactNode> {
    const { domain } = params;
    const ctx = await runtime.getCtx(domain);
    if (!manifest.access.create) notFound();
    if (!(await manifest.access.create(runtime.toAccessCtx(ctx, domain)))) notFound();

    const collection = ctx.payload.config.collections.find((c) => c.slug === manifest.collection);
    if (!collection) throw new Error(`[editor] unknown collection slug: ${manifest.collection}`);

    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: ctx.payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: ctx.payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: ctx.user as never } }, ctx.payload);

    const { state: initialState } = await runtime.buildFormState({
        collectionSlug: String(manifest.collection),
        data: {},
        operation: 'create',
        docPermissions: { create: true, fields: true, read: true, update: true },
        docPreferences: { fields: {} },
        req,
        schemaPath: String(manifest.collection),
        skipValidation: true,
    });

    const clientConfig = await runtime.getClientConfig(domain);

    const boundCreate = async (formData: FormData) => {
        await generatedActions.create(domain, formData);
    };

    const hasDrafts =
        collection.versions !== undefined &&
        (collection.versions as { drafts?: unknown }).drafts !== undefined &&
        (collection.versions as { drafts?: unknown }).drafts !== false;
    const autosave =
        hasDrafts && (collection.versions as { drafts: { autosave?: { interval: number } } }).drafts.autosave
            ? (collection.versions as { drafts: { autosave: { interval: number } } }).drafts.autosave
            : undefined;
    const breadcrumbs = manifest.routes.breadcrumbs?.({ domain }) ?? [];

    return (
        <runtime.DocumentForm
            title={`New ${manifest.routes.label.singular}`}
            breadcrumbs={breadcrumbs}
            clientConfig={clientConfig}
            onSubmit={boundCreate}
            initialState={initialState}
            toolbar={
                <EditorFormToolbar
                    Toolbar={runtime.Toolbar}
                    saveDraftAction={boundCreate}
                    publishAction={boundCreate}
                    autosave={autosave}
                />
            }
        >
            <EditorFields collection={String(manifest.collection)} />
        </runtime.DocumentForm>
    );
}
