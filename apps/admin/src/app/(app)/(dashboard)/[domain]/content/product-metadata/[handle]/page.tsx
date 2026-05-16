import 'server-only';

import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import type { LocaleOption } from '@/components/cms/locale-switcher';
import { LocaleSwitcher } from '@/components/cms/locale-switcher';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { publishProductMetadataAction, saveProductMetadataDraftAction } from '@/lib/cms-actions/product-metadata';
import { getCmsShellProps } from '@/lib/get-cms-shell-props';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { ProductMetadataFields } from './product-metadata-fields';
import { ProductMetadataForm } from './product-metadata-form';

export const metadata: Metadata = {
    title: 'Edit Product Metadata',
};

export type EditProductMetadataProps = {
    params: Promise<{ domain: string; handle: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditProductMetadataPage({ params, searchParams }: EditProductMetadataProps) {
    const { domain, handle: encodedHandle } = await params;
    // URL-decode the handle in case it contains special characters (e.g. encoded hyphens).
    const handle = decodeURIComponent(encodedHandle);
    const { locale: localeParam } = await searchParams;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        return null;
    }

    // ── Client config ─────────────────────────────────────────────────────────
    const shellProps = await getCmsShellProps(domain);

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

    // ── Fetch existing doc by (tenant, handle) ────────────────────────────────
    // `draft: true` fetches the latest in-progress state, not the last
    // published snapshot, so the editor starts from the most recent draft.
    // May return null if no metadata exists for this handle yet — in that
    // case the form starts empty and the first save will create the doc.
    const { docs } = await payload.find({
        collection: 'productMetadata',
        where: {
            and: [{ tenant: { equals: tenant.id } }, { shopifyHandle: { equals: handle } }],
        },
        limit: 1,
        locale: locale as never,
        user,
        overrideAccess: false,
        draft: true,
    });
    const existing = docs[0] ?? null;

    // ── Build Payload FormState ───────────────────────────────────────────────
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

    // When no existing doc: pass empty data — `buildFormState` populates all
    // fields with their default values, giving the editor a clean form.
    const { state: initialState } = await buildCmsFormState({
        collectionSlug: 'productMetadata',
        data: existing ?? {},
        id: existing ? String(existing.id) : undefined,
        operation: existing ? 'update' : 'create',
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
        schemaPath: 'productMetadata',
        skipValidation: true,
    });

    // ── Bind domain + handle into server actions ──────────────────────────────
    // Three positional args: `domain`, `handle`, `formData`. The client
    // component calls `saveDraftAction(formData)` after bind produces the
    // correct `(formData) => Promise<void>` shape.
    const boundSaveDraft = saveProductMetadataDraftAction.bind(null, domain, handle);
    const boundPublish = publishProductMetadataAction.bind(null, domain, handle);

    const pageTitle = existing ? `Metadata: ${handle}` : `New metadata: ${handle}`;

    return (
        <DocumentForm
            title={pageTitle}
            breadcrumbs={[
                { label: 'Content', href: `/${domain}/content/` as Route },
                { label: 'Product Metadata', href: `/${domain}/content/product-metadata/` as Route },
                { label: handle },
            ]}
            shellProps={shellProps}
            onSubmit={boundSaveDraft}
            initialState={initialState}
            toolbar={
                <>
                    <LocaleSwitcher locales={configLocales} currentLocale={locale} />
                    <ProductMetadataForm saveDraftAction={boundSaveDraft} publishAction={boundPublish} />
                </>
            }
        >
            <ProductMetadataFields />
        </DocumentForm>
    );
}
