import 'server-only';

import type { Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { CollectionSlug } from 'payload';
import { getRequestLanguage } from 'payload';
import { parseCookies } from 'payload/shared';
import type { ReactNode } from 'react';
import type { EditorActions } from '../actions';
import type { CollectionEditorManifest } from '../manifest';
import type { EditorRuntime } from '../runtime';
import { docUrlSegment } from '../url';
import { localeLabel } from './locale-label';
import { LocaleSwitcher } from './locale-switcher';

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
 * document. Fetches up to 50 past versions sorted by `updatedAt` descending
 * and renders each with a restore button wired to the generated
 * `restoreVersion` action.
 *
 * @param props - {@link EditorVersionsPageProps} carrying manifest, runtime, params, and generated actions.
 * @returns The rendered version list with a back-link and locale switcher.
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
        redirect(`${base}${docUrlSegment(manifest, id)}versions/?${next.toString()}` as Route);
    }

    const locale = requested as string;

    // Tenant-scoped `findVersions` uses the `version.tenant` path because
    // versions are stored separately and embed the parent's tenant ref.
    const where =
        manifest.tenant.kind === 'scoped' && ctx.tenant ? { 'version.tenant': { equals: ctx.tenant.id } } : undefined;

    const { docs } = await ctx.payload.findVersions({
        collection: manifest.collection as never,
        where: where as never,
        sort: '-updatedAt',
        limit: 50,
        user: ctx.user as never,
        overrideAccess: false,
    });

    const backHref =
        `${manifest.routes.basePath(domain)}${docUrlSegment(manifest, id)}?locale=${encodeURIComponent(locale)}` as Route;

    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: ctx.payload.config, cookies, headers });

    const localeOptions = (ctx.tenant?.locales ?? [tenantDefault]).map((code) => ({
        code,
        label: localeLabel(code, language),
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

            {docs.length === 0 ? (
                <p className="text-gray-500">No version history yet.</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {docs.map((v) => {
                        const isLatest = (v as { latest?: boolean }).latest === true;
                        const versionData = (v as { version?: Record<string, unknown> }).version ?? {};
                        const updatedBy = versionData.updatedBy;
                        const authorLabel =
                            typeof updatedBy === 'object' && updatedBy !== null && 'email' in updatedBy
                                ? String((updatedBy as { email: unknown }).email)
                                : typeof updatedBy === 'string' && updatedBy.length > 0
                                  ? updatedBy
                                  : 'Unknown';
                        const restoreThis = generatedActions.restoreVersion.bind(
                            null,
                            domain,
                            id,
                            String((v as { id: string }).id),
                        );

                        return (
                            <li
                                key={String((v as { id: string }).id)}
                                className="flex items-center justify-between px-4 py-3"
                            >
                                <div className="flex flex-col gap-0.5">
                                    <time
                                        dateTime={(v as { updatedAt: string }).updatedAt}
                                        className="font-medium text-gray-900 text-sm"
                                    >
                                        {new Date((v as { updatedAt: string }).updatedAt).toLocaleString()}
                                    </time>
                                    <span className="text-gray-500 text-xs">{authorLabel}</span>
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
