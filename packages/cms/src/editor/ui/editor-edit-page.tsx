import 'server-only';

import type { Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { getRequestLanguage } from 'payload';
import { parseCookies } from 'payload/shared';
import type { ReactNode } from 'react';
import type { EditorActions } from '../actions';
import type { CollectionEditorManifest } from '../manifest';
import { tenantWhere } from '../revalidate';
import type { EditorRuntime } from '../runtime';
import { docUrlSegment } from '../url';
import { EditorFields } from './editor-fields';
import { EditorFormToolbar } from './editor-form-toolbar';
import { localeLabel } from './locale-label';
import { LocaleSwitcher } from './locale-switcher';

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
 * Resolves the locale (redirecting when absent), fetches the doc, builds the
 * native `FormState`, and assembles the `<DocumentForm>` shell with bound
 * save-draft / publish actions and an optional live-preview iframe.
 *
 * @param props - {@link EditorEditPageProps} carrying manifest, runtime, params, and generated actions.
 * @returns The rendered edit page wrapped in the runtime's `DocumentForm` shell.
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

    const collection = ctx.payload.config.collections.find((c) => c.slug === manifest.collection);

    // ── Locale resolution ──
    // Shop's defaultLocale (from tenant) wins over the global Payload default;
    // searchParams.locale wins if it's in the tenant's allow-list. Otherwise
    // redirect to ?locale=<shop default> so the URL is always populated and
    // the doc fetch always uses a valid locale.
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
        redirect(`${base}${docUrlSegment(manifest, id)}?${next.toString()}` as Route);
    }

    const locale = requested as string;

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

    // Build the native form state. The language is still resolved Payload-style
    // (cookie/header negotiation) because the locale switcher labels read it.
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: ctx.payload.config, cookies, headers });

    const { state: initialState } = await runtime.buildFormState({
        collectionSlug: String(manifest.collection),
        data: (existing as unknown as Record<string, unknown>) ?? {},
        id: existing ? String((existing as unknown as { id: string }).id) : undefined,
        operation: existing ? 'update' : 'create',
        locale,
    });

    const shellProps = await runtime.getShellProps(domain, locale);

    // Bind the codegen'd action wrappers to (domain, id, locale). The locale
    // closes over the request-time value the editor is currently viewing so
    // saves write into the correct localized field bucket instead of falling
    // back to Payload's configured default.
    const boundSaveDraft = async (formData: FormData) => {
        'use server';
        return generatedActions.saveDraft(domain, id, formData, locale);
    };
    const boundPublish = async (formData: FormData) => {
        'use server';
        return generatedActions.publish(domain, id, formData, locale);
    };

    const existingName = (existing as unknown as { name?: string } | null)?.name;
    const title = existingName ? String(existingName) : manifest.routes.label.singular;

    const breadcrumbs = manifest.routes.breadcrumbs?.({ domain }) ?? [];

    const autosave =
        hasDrafts && collection !== undefined
            ? (collection.versions as { drafts: { autosave?: { interval: number } } }).drafts.autosave
            : undefined;

    const localeOptions = (ctx.tenant?.locales ?? [tenantDefault]).map((code) => ({
        code,
        label: localeLabel(code, language),
    }));

    return (
        <runtime.DocumentForm
            title={title}
            breadcrumbs={breadcrumbs}
            shellProps={shellProps}
            onSubmit={boundSaveDraft}
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
            {fieldSurface ?? <EditorFields collection={String(manifest.collection)} omitPaths={omitPaths} />}
        </runtime.DocumentForm>
    );
}
