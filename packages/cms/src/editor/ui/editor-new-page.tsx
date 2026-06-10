import 'server-only';

import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import type { ReactNode } from 'react';

import type { EditorActions } from '../actions';
import { editorCollectionSchema } from '../collection-fields';
import type { CollectionEditorManifest } from '../manifest';
import { loadRelationshipOptions } from '../relationship-targets';
import type { EditorRuntime } from '../runtime';
import { EditorFields } from './editor-fields';
import { EditorFormToolbar } from './editor-form-toolbar';

/**
 * Props for {@link EditorNewPage}.
 *
 * @example
 * <EditorNewPage manifest={pagesEditor} runtime={runtime} params={{ domain: 'example.com' }} searchParams={searchParams} generatedActions={pagesActions} />
 */
export type EditorNewPageProps<TSlug extends CollectionSlug = CollectionSlug> = {
    manifest: CollectionEditorManifest<TSlug>;
    runtime: EditorRuntime;
    params: { domain: string | null };
    searchParams: { locale?: string };
    generatedActions: EditorActions;
};

/**
 * Server Component that renders the new-document creation form. Enforces
 * create access, resolves the locale, builds an empty native `FormState`,
 * and assembles the `<DocumentForm>` shell with a bound create action. The
 * field surface and the drafts/autosave behavior both come from the
 * collection's editor schema (`collection-fields.ts` — the CMSDATA-07 native
 * rebind), so no Payload config is consulted.
 *
 * @param props - {@link EditorNewPageProps} carrying manifest, runtime, params, and generated actions.
 * @returns The rendered new-document form wrapped in the runtime's `DocumentForm` shell.
 */
export async function EditorNewPage<TSlug extends CollectionSlug>({
    manifest,
    runtime,
    params,
    searchParams,
    generatedActions,
}: EditorNewPageProps<TSlug>): Promise<ReactNode> {
    const { domain } = params;
    const ctx = await runtime.getCtx(domain);
    if (!manifest.access.create) notFound();
    if (!(await manifest.access.create(runtime.toAccessCtx(ctx, domain)))) notFound();

    // ── Locale resolution ── (mirrors EditorEditPage)
    const tenantDefault = ctx.tenant?.defaultLocale ?? 'en-US';
    const allowed = ctx.tenant?.locales ?? [tenantDefault];
    const requested = searchParams.locale;
    const valid = typeof requested === 'string' && allowed.includes(requested);

    if (!valid) {
        const next = new URLSearchParams();
        for (const [key, value] of Object.entries(searchParams)) {
            // Skip `locale` (overridden below) and skip array-valued params
            // (Next allows `string | string[]` in searchParams; current
            // callers pass only strings, but the guard keeps this safe).
            if (key !== 'locale' && typeof value === 'string') next.set(key, value);
        }
        next.set('locale', tenantDefault);
        const base = manifest.routes.basePath(domain);
        redirect(`${base}new/?${next.toString()}` as Route);
    }

    const locale = requested as string;

    const { state: initialState } = await runtime.buildFormState({
        collectionSlug: String(manifest.collection),
        data: {},
        operation: 'create',
        locale,
    });

    const shellProps = await runtime.getShellProps(domain, locale);

    const boundCreate = async (formData: FormData) => {
        'use server';
        await generatedActions.create(domain, formData, locale);
    };

    const schema = editorCollectionSchema(String(manifest.collection));
    const autosave = schema.drafts?.autosave;
    const breadcrumbs = manifest.routes.breadcrumbs?.({ domain }) ?? [];

    // CMSGATE-02 live transports — threaded through <EditorFields>'s own props
    // (its internal providers shadow any outer ones; see EditorEditPage).
    const relationshipOptions = await loadRelationshipOptions(runtime.convex, schema.fields);
    const mediaUpload = runtime.mediaUploadAction;
    const boundUpload = mediaUpload
        ? async (formData: FormData) => {
              'use server';
              return mediaUpload(domain, formData);
          }
        : undefined;

    return (
        <runtime.DocumentForm
            title={`New ${manifest.routes.label.singular}`}
            breadcrumbs={breadcrumbs}
            shellProps={shellProps}
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
            <EditorFields
                collection={String(manifest.collection)}
                locale={locale}
                defaultLocale={tenantDefault}
                relationshipOptions={relationshipOptions}
                uploadAction={boundUpload}
            />
        </runtime.DocumentForm>
    );
}
