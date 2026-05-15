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
import { publishPageAction, savePageDraftAction } from '@/lib/cms-actions/pages';
import { getCmsClientConfig } from '@/lib/get-client-config';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { PageFields } from './page-fields';
import { PageForm } from './page-form';

export const metadata: Metadata = {
    title: 'Edit Page',
};

export type EditPageProps = {
    params: Promise<{ domain: string; id: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditPagePage({ params, searchParams }: EditPageProps) {
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

    // ── Fetch page by id ──────────────────────────────────────────────────────
    // `draft: true` fetches the latest in-progress state, not the last
    // published snapshot, so the editor starts from the most recent draft.
    const page = await payload.findByID({
        collection: 'pages',
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
        page.tenant != null && typeof page.tenant === 'object' && 'id' in page.tenant
            ? String((page.tenant as { id: unknown }).id)
            : String(page.tenant ?? '');

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
        collectionSlug: 'pages',
        data: page,
        id: String(page.id),
        operation: 'update',
        // TODO: For per-field access use payload.docAccess({ collection: 'pages', id, req })
        // rather than the blanket `true` shortcut used here. Pages have the same uniform
        // tenant-scoped access as header/footer, so this is correct for now.
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
        schemaPath: 'pages',
        skipValidation: true,
    });

    // ── Bind domain + id into server actions ──────────────────────────────────
    // Three positional args: `domain`, `id`, `formData`. The client component
    // calls `saveDraftAction(formData)` after bind produces the correct shape.
    const boundSaveDraft = savePageDraftAction.bind(null, domain, id);
    const boundPublish = publishPageAction.bind(null, domain, id);

    const pageTitle = page.title ?? `Page ${id}`;

    return (
        <DocumentForm
            title={pageTitle}
            breadcrumbs={[
                { label: 'Content', href: `/${domain}/content/` as Route },
                { label: 'Pages', href: `/${domain}/content/pages/` as Route },
                { label: pageTitle },
            ]}
            clientConfig={clientConfig}
            onSubmit={boundSaveDraft}
            initialState={initialState}
            toolbar={
                <>
                    <LocaleSwitcher locales={configLocales} currentLocale={locale} />
                    <PageForm saveDraftAction={boundSaveDraft} publishAction={boundPublish} />
                </>
            }
        >
            <PageFields />
        </DocumentForm>
    );
}
