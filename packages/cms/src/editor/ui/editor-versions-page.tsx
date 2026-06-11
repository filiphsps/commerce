import 'server-only';

import { MissingConvexBridgeError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { documentTargetFor, type EditorActions } from '../actions';
import type { CollectionEditorManifest, CollectionSlug } from '../manifest';
import type { EditorCmsVersion, EditorRuntime } from '../runtime';
import { docUrlSegment } from '../url';
import { localeLabel } from './locale-label';
import { LocaleSwitcher } from './locale-switcher';
import { relativeTimeLabel } from './relative-time';

/**
 * The quiet placeholder rendered for a version with no author stamp — migrated/pre-stamp rows are
 * never backfilled, so absence is expected history, not an error state.
 */
const ABSENT_AUTHOR = '—';

/** Maximum versions rendered, newest first — mirrors the legacy `limit: 50` read. */
const MAX_VERSIONS = 50;

/**
 * Props for {@link EditorVersionsPage}.
 *
 * @example
 * <EditorVersionsPage manifest={pagesEditor} runtime={runtime} params={{ domain, id }} searchParams={searchParams} generatedActions={pagesActions} />
 */
export type EditorVersionsPageProps<TSlug extends CollectionSlug = CollectionSlug> = {
    manifest: CollectionEditorManifest<TSlug>;
    runtime: EditorRuntime;
    params: { domain: string | null; id: string };
    searchParams: { locale?: string };
    generatedActions: EditorActions;
};

/**
 * Server Component that renders the version history list for a single
 * document. Resolves the document through the bridge's Convex read
 * (`cms/documents:get`), lists its snapshots via `cms/versions:list`
 * (CMSDATA-07), and renders each — newest first, capped at
 * {@link MAX_VERSIONS} — with the locale-aware relative save time (absolute
 * timestamp on hover), the stamped author ({@link ABSENT_AUTHOR} for
 * pre-stamp rows), and a restore button wired to the generated
 * `restoreVersion` action (Convex `cms/versions:restore`, which
 * re-materializes the snapshot as a new draft).
 *
 * @param props - {@link EditorVersionsPageProps} carrying manifest, runtime, params, and generated actions.
 * @returns The rendered version list with a back-link and locale switcher.
 * @throws {MissingConvexBridgeError} When the runtime carries no Convex bridge.
 */
export async function EditorVersionsPage<TSlug extends CollectionSlug>({
    manifest,
    runtime,
    params,
    searchParams,
    generatedActions,
}: EditorVersionsPageProps<TSlug>): Promise<ReactNode> {
    const { domain, id } = params;
    const ctx = await runtime.getCtx(domain);
    if (!(await manifest.access.read(runtime.toAccessCtx(ctx, domain)))) notFound();
    if (!runtime.convex) {
        throw new MissingConvexBridgeError(manifest.collection);
    }

    // ── Locale resolution ── (mirrors EditorEditPage)
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
        redirect(`${base}${docUrlSegment(manifest, id)}versions/?${next.toString()}` as Route);
    }

    const locale = requested as string;

    // The versions query addresses by live document id, so keyField/singleton
    // routes resolve their document first — through the same target mapping
    // the save actions use.
    const doc = await runtime.convex.getDocument({
        collection: String(manifest.collection),
        ...documentTargetFor(manifest, id),
    });
    const history: EditorCmsVersion[] = doc ? await runtime.convex.listVersions({ documentId: doc.documentId }) : [];
    // `cms/versions:list` returns oldest first; the page renders newest first.
    const versions = history.slice(-MAX_VERSIONS).reverse();

    const backHref =
        `${manifest.routes.basePath(domain)}${docUrlSegment(manifest, id)}?locale=${encodeURIComponent(locale)}` as Route;

    // Labels resolve in the ACTIVE locale (always one of the shop's configured set), so a German
    // shop reads "Deutsch", not a hardcoded English exonym; an untranslatable code falls back to
    // itself inside `localeLabel`.
    const localeOptions = allowed.map((code) => ({
        code,
        label: localeLabel(code, locale),
    }));

    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <runtime.PageHeader
                title={`${manifest.routes.label.singular} — Versions`}
                breadcrumbs={[
                    ...(manifest.routes.breadcrumbs?.({ domain }) ?? []),
                    { label: manifest.routes.label.singular, href: `${manifest.routes.basePath(domain)}${id}/` },
                    { label: 'Versions' },
                ]}
            />
            <div className="mb-8 flex items-center justify-end gap-4">
                <LocaleSwitcher locales={localeOptions} currentLocale={locale} />
                <nav>
                    <Link href={backHref} className="text-blue-600 text-sm hover:underline">
                        ← Back to editor
                    </Link>
                </nav>
            </div>

            {versions.length === 0 ? (
                <p className="text-gray-500">No version history yet.</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {versions.map((version) => {
                        const isLatest = doc?.latestVersionId === version.versionId;
                        const createdAt = new Date(version.createdAt);
                        const restoreThis = generatedActions.restoreVersion.bind(null, domain, id, version.versionId);

                        return (
                            <li key={version.versionId} className="flex items-center justify-between px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                    <time
                                        dateTime={createdAt.toISOString()}
                                        title={createdAt.toLocaleString()}
                                        className="font-medium text-gray-900 text-sm"
                                    >
                                        {relativeTimeLabel(version.createdAt, locale)}
                                    </time>
                                    <span className="text-gray-500 text-xs">
                                        <span className="capitalize">{version.status}</span>
                                        {' · '}
                                        {version.author?.label ?? ABSENT_AUTHOR}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isLatest && (
                                        <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
                                            Current
                                        </span>
                                    )}
                                    <form action={restoreThis}>
                                        <button
                                            type="submit"
                                            disabled={isLatest}
                                            className="rounded border border-gray-300 px-3 py-1 font-medium text-gray-700 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Restore
                                        </button>
                                    </form>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
