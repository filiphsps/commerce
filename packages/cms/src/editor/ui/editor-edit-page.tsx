import 'server-only';

import { MissingConvexBridgeError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CMS_BASE_VERSION_FIELD, documentTargetFor, type EditorActions } from '../actions';
import { editorCollectionSchema } from '../collection-fields';
import type { CollectionEditorManifest, CollectionSlug } from '../manifest';
import { loadRelationshipOptions } from '../relationship-targets';
import type { EditorRuntime } from '../runtime';
import { docUrlSegment } from '../url';
import { EditorFields } from './editor-fields';
import { EditorFormToolbar } from './editor-form-toolbar';
import { localeLabel } from './locale-label';
import { LocaleSwitcher } from './locale-switcher';

/**
 * The UI language locale labels resolve in. Fixed: the admin shell is
 * English-only since the Payload i18n negotiation (cookie/header) left with
 * the legacy form state builder.
 */
const UI_LANGUAGE = 'en';

/**
 * Props for {@link EditorEditPage}. Carries the manifest, runtime, resolved
 * route params, the codegen'd server-action wrappers, and an optional
 * live-preview slot.
 *
 * @example
 * <EditorEditPage manifest={pagesEditor} runtime={runtime} params={params} searchParams={searchParams} generatedActions={pagesActions} />
 */
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
    /**
     * Optional replacement for the default field surface. When omitted the page
     * renders `<EditorFields collection=… omitPaths={omitPaths} />`; routes that
     * own a bespoke editor (e.g. the theme editor) pass their own element here.
     */
    fieldSurface?: ReactNode;
    /**
     * Forwarded to the default `<EditorFields>` when no `fieldSurface` is given:
     * named top-level fields to drop from the rendered tree only (their
     * `FormState` entries stay intact for save). Ignored when `fieldSurface` is set.
     */
    omitPaths?: string[];
};

/**
 * Server Component that renders the edit form for a single document.
 * Resolves the locale (redirecting when absent), fetches the doc through the
 * bridge's Convex read (`cms/documents:get` — the CMSDATA-07 shell rebind),
 * builds the native `FormState`, and assembles the `<DocumentForm>` shell
 * with bound save-draft / publish actions and an optional live-preview
 * iframe. Drafts/autosave behavior comes from the collection's editor schema
 * (`collection-fields.ts`), not a Payload config.
 *
 * @param props - {@link EditorEditPageProps} carrying manifest, runtime, params, and generated actions.
 * @returns The rendered edit page wrapped in the runtime's `DocumentForm` shell.
 * @throws {MissingConvexBridgeError} When the runtime carries no Convex bridge.
 * @example
 * ```tsx
 * <EditorEditPage
 *   manifest={pagesEditor}
 *   runtime={runtime}
 *   params={{ domain, id }}
 *   searchParams={searchParams}
 *   generatedActions={pagesActions}
 * />
 * ```
 */
export async function EditorEditPage<TSlug extends CollectionSlug>({
    manifest,
    runtime,
    params,
    searchParams,
    generatedActions,
    livePreview,
    fieldSurface,
    omitPaths,
}: EditorEditPageProps<TSlug>): Promise<ReactNode> {
    const { domain, id } = params;
    const ctx = await runtime.getCtx(domain);
    if (!(await manifest.access.read(runtime.toAccessCtx(ctx, domain)))) notFound();
    if (!runtime.convex) {
        throw new MissingConvexBridgeError(manifest.collection);
    }

    // ── Locale resolution ──
    // Shop's defaultLocale (from tenant) wins; searchParams.locale wins if it's
    // in the tenant's allow-list. Otherwise redirect to ?locale=<shop default>
    // so the URL is always populated and the doc edit always targets a valid
    // locale bucket.
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
        redirect(`${base}${docUrlSegment(manifest, id)}?${next.toString()}` as Route);
    }

    const locale = requested as string;

    const schema = editorCollectionSchema(String(manifest.collection));
    const existing = await runtime.convex.getDocument({
        collection: String(manifest.collection),
        ...documentTargetFor(manifest, id),
    });

    const { state: initialState } = await runtime.buildFormState({
        collectionSlug: String(manifest.collection),
        data: existing?.data ?? {},
        id: existing?.documentId,
        operation: existing ? 'update' : 'create',
        locale,
    });

    // Bind the codegen'd action wrappers to (domain, id, locale). The locale
    // closes over the request-time value the editor is currently viewing so
    // saves write into the correct localized field bucket instead of falling
    // back to the platform default.
    //
    // The draft binding also closes over the document's latestVersionId at render time — the
    // optimistic base the G4FIX-01 stale-write contract carries. A publish refreshes the edit
    // path (refreshEditorPaths), so the rebound action advances the base past the publish; a
    // diverged autosave still on the wire keeps the old base and is flagged server-side.
    const baseVersionId = existing?.latestVersionId;
    const boundSaveDraft = async (formData: FormData) => {
        'use server';
        if (baseVersionId !== undefined) formData.set(CMS_BASE_VERSION_FIELD, baseVersionId);
        return generatedActions.saveDraft(domain, id, formData, locale);
    };
    // The form element's implicit-submit path. Same draft save, result
    // swallowed: only the toolbar reads the POLISH-02 conflict marker back,
    // and the shell's `onSubmit` contract is void.
    const boundSubmit = async (formData: FormData): Promise<void> => {
        'use server';
        await boundSaveDraft(formData);
    };
    const boundPublish = async (formData: FormData) => {
        'use server';
        return generatedActions.publish(domain, id, formData, locale);
    };

    // The CMSGATE-02 live transports for the default field surface. Both must
    // thread through <EditorFields>'s own props — it mounts its own providers,
    // so wrapping it from out here would be shadowed. A bespoke `fieldSurface`
    // owns its data wiring, so the prefetch is skipped entirely for it.
    const relationshipOptions = fieldSurface ? {} : await loadRelationshipOptions(runtime.convex, schema.fields);
    const mediaUpload = runtime.mediaUploadAction;
    const boundUpload = mediaUpload
        ? async (formData: FormData) => {
              'use server';
              return mediaUpload(domain, formData);
          }
        : undefined;

    const existingName = existing?.data.name;
    const title = typeof existingName === 'string' && existingName ? existingName : manifest.routes.label.singular;

    const breadcrumbs = manifest.routes.breadcrumbs?.({ domain }) ?? [];

    const autosave = schema.drafts?.autosave;

    const localeOptions = allowed.map((code) => ({
        code,
        label: localeLabel(code, UI_LANGUAGE),
    }));

    return (
        <runtime.DocumentForm
            title={title}
            breadcrumbs={breadcrumbs}
            onSubmit={boundSubmit}
            initialState={initialState}
            toolbar={
                <EditorFormToolbar
                    Toolbar={runtime.Toolbar}
                    saveDraftAction={boundSaveDraft}
                    publishAction={boundPublish}
                    autosave={autosave}
                    localeSwitcher={<LocaleSwitcher locales={localeOptions} currentLocale={locale} />}
                />
            }
            livePreview={livePreview}
        >
            {fieldSurface ?? (
                <EditorFields
                    collection={String(manifest.collection)}
                    omitPaths={omitPaths}
                    locale={locale}
                    defaultLocale={tenantDefault}
                    relationshipOptions={relationshipOptions}
                    uploadAction={boundUpload}
                />
            )}
        </runtime.DocumentForm>
    );
}
