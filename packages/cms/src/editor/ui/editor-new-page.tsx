import 'server-only';

import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import type { EditorActions } from '../actions';
import { editorCollectionSchema } from '../collection-fields';
import { parseFormPayload } from '../form-payload';
import type { CollectionEditorManifest, CollectionSlug } from '../manifest';
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
 * and assembles the `<DocumentForm>` shell with a create BINDING: the
 * toolbar's first save creates the document, pins the returned id, and
 * shallow-replaces the URL with the edit route, so subsequent autosave ticks
 * save drafts against that one id instead of fanning out one create per
 * tick. The field surface and the drafts/autosave behavior both come from
 * the collection's editor schema (`collection-fields.ts` — the CMSDATA-07
 * native rebind), so no Payload config is consulted.
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

    // Serializable scalars the inline server actions below close over — the
    // manifest itself carries functions, so anything derived from it must be
    // flattened here before crossing the action boundary.
    const keyField = manifest.routes.keyField ?? 'id';
    const basePath = String(manifest.routes.basePath(domain));
    const singletonRoute =
        manifest.tenant.kind === 'tenant-singleton' || manifest.tenant.kind === 'singleton-by-domain';
    const editQuery = new URLSearchParams({ locale }).toString();

    /**
     * First save on /new/: creates the document and resolves the route id the
     * toolbar binds every subsequent save to. keyField-routed collections
     * address documents by content key everywhere (`documentTargetFor`), so
     * the persisted key — not the Convex document id — is what the follow-up
     * `saveDraftFor` calls and the edit URL must carry; an absent/empty key
     * falls back to the document id, which matches how the list/edit routes
     * would (fail to) address such a row today.
     */
    const boundCreate = async (formData: FormData): Promise<{ id: string; editUrl: string }> => {
        'use server';
        const { id: documentId } = await generatedActions.create(domain, formData, locale);
        let routeId = documentId;
        if (keyField !== 'id') {
            const key = parseFormPayload(formData)[keyField];
            if (typeof key === 'string' && key.length > 0) routeId = key;
        }
        const segment = singletonRoute ? '' : `${routeId}/`;
        return { id: routeId, editUrl: `${basePath}${segment}?${editQuery}` };
    };

    /**
     * Draft save against the route id {@link boundCreate} resolved — the
     * post-binding autosave/Save Draft path.
     *
     * @param id - The bound route id.
     * @param formData - The serialized form snapshot.
     */
    const boundSaveDraftFor = async (id: string, formData: FormData) => {
        'use server';
        await generatedActions.saveDraft(domain, id, formData, locale);
    };

    /**
     * Publish against the bound route id, so Publish on /new/ actually
     * publishes the created document instead of leaving a draft.
     *
     * @param id - The bound route id.
     * @param formData - The serialized form snapshot.
     */
    const boundPublishFor = async (id: string, formData: FormData) => {
        'use server';
        await generatedActions.publish(domain, id, formData, locale);
    };

    /**
     * The form element's own submit path. Implicit submission has no access to
     * the toolbar's client-side binding, so it keeps first-create semantics;
     * the toolbar owns every deliberate save surface.
     *
     * @param formData - The serialized form snapshot.
     */
    const boundSubmit = async (formData: FormData): Promise<void> => {
        'use server';
        await boundCreate(formData);
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
            onSubmit={boundSubmit}
            initialState={initialState}
            toolbar={
                <EditorFormToolbar
                    Toolbar={runtime.Toolbar}
                    createBinding={{
                        create: boundCreate,
                        saveDraftFor: boundSaveDraftFor,
                        publishFor: boundPublishFor,
                    }}
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
