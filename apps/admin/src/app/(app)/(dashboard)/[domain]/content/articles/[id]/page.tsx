import 'server-only';

import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import type { LocaleOption } from '@/components/cms/locale-switcher';
import { LocaleSwitcher } from '@/components/cms/locale-switcher';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { publishArticleAction, saveArticleDraftAction } from '@/lib/cms-actions/articles';
import { getCmsClientConfig } from '@/lib/get-client-config';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { ArticleFields } from './article-fields';
import { ArticleForm } from './article-form';

export const metadata: Metadata = {
    title: 'Edit Article',
};

export type EditArticleProps = {
    params: Promise<{ domain: string; id: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditArticlePage({ params, searchParams }: EditArticleProps) {
    const { domain, id } = await params;
    const { locale: localeParam } = await searchParams;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        return null;
    }

    // ── Client config ─────────────────────────────────────────────────────────
    const clientConfig = await getCmsClientConfig(domain);

    // ── Locale resolution ─────────────────────────────────────────────────────
    const localizationConfig = payload.config.localization !== false ? payload.config.localization : undefined;

    const configLocales: LocaleOption[] =
        (localizationConfig?.locales ?? []).length > 0
            ? (localizationConfig?.locales ?? []).map((l) => {
                  const label = typeof l.label === 'string' ? l.label : (l.label?.en ?? l.code);
                  return { code: l.code, label };
              })
            : [{ code: 'en-US', label: 'English' }];

    const defaultLocale = localizationConfig?.defaultLocale ?? 'en-US';
    const locale = configLocales.find((l) => l.code === localeParam)?.code ?? defaultLocale;

    // ── Fetch article by id ───────────────────────────────────────────────────
    // `draft: true` fetches the latest in-progress state, not the last
    // published snapshot, so the editor starts from the most recent draft.
    const article = await payload.findByID({
        collection: 'articles',
        id,
        locale: locale as never,
        user,
        overrideAccess: false,
        draft: true,
    });

    // ── Tenant-match guard (defense in depth) ─────────────────────────────────
    // `findByID` with `overrideAccess: false` already enforces the
    // `tenantScopedRead` access predicate, but we add an explicit check to
    // prevent cross-tenant id-guessing attacks that somehow pass the layer.
    const docTenantId =
        article.tenant != null && typeof article.tenant === 'object' && 'id' in article.tenant
            ? String((article.tenant as { id: unknown }).id)
            : String(article.tenant ?? '');

    if (docTenantId !== String(tenant.id)) {
        notFound();
    }

    // ── Build Payload FormState ───────────────────────────────────────────────
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

    const { state: initialState } = await buildCmsFormState({
        collectionSlug: 'articles',
        data: article,
        id: String(article.id),
        operation: 'update',
        docPermissions: {
            create: true,
            fields: true,
            read: true,
            readVersions: true,
            update: true,
        },
        docPreferences: { fields: {} },
        locale,
        req,
        schemaPath: 'articles',
        skipValidation: true,
    });

    // ── Bind domain + id into server actions ──────────────────────────────────
    // Three positional args: `domain`, `id`, `formData`. The client component
    // calls `saveDraftAction(formData)` after bind produces the correct shape.
    const boundSaveDraft = saveArticleDraftAction.bind(null, domain, id);
    const boundPublish = publishArticleAction.bind(null, domain, id);

    const articleTitle = article.title ?? `Article ${id}`;

    return (
        <DocumentForm
            title={articleTitle}
            breadcrumbs={[
                { label: 'Content', href: `/${domain}/content/` as Route },
                { label: 'Articles', href: `/${domain}/content/articles/` as Route },
                { label: articleTitle },
            ]}
            clientConfig={clientConfig}
            onSubmit={boundSaveDraft}
            initialState={initialState}
            toolbar={
                <>
                    <LocaleSwitcher locales={configLocales} currentLocale={locale} />
                    <ArticleForm saveDraftAction={boundSaveDraft} publishAction={boundPublish} />
                </>
            }
        >
            <ArticleFields />
        </DocumentForm>
    );
}
