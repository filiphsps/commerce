import 'server-only';

import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import { LivePreviewIframe } from '@/components/cms/live-preview-iframe';
import type { LocaleOption } from '@/components/cms/locale-switcher';
import { LocaleSwitcher } from '@/components/cms/locale-switcher';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { publishFooterAction, saveFooterDraftAction } from '@/lib/cms-actions/footer';
import { getCmsClientConfig } from '@/lib/get-client-config';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { buildLivePreviewUrl } from '@/payload.config';
import { FooterFields } from './footer-fields';
import { FooterForm } from './footer-form';

export type FooterPageProps = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export const metadata: Metadata = {
    title: 'Footer',
};

export default async function FooterPage({ params, searchParams }: FooterPageProps) {
    const { domain } = await params;
    const { locale: localeParam } = await searchParams;

    // ── Auth + tenant resolution ──────────────────────────────────────────────
    // `getAuthedPayloadCtx` redirects to /auth/login/ if no session, and calls
    // notFound() if the domain doesn't map to a known tenant. Both are non-null
    // after this call returns.
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    // tenant is non-null when domain is supplied — the helper calls notFound()
    // otherwise. The explicit guard below keeps TypeScript happy.
    if (!tenant) {
        return null;
    }

    // ── Client config ─────────────────────────────────────────────────────────
    const clientConfig = await getCmsClientConfig(domain);

    // ── Locale resolution ─────────────────────────────────────────────────────
    // Build the list of available locales from the Payload config (populated
    // via NORDCOM_CMS_LOCALES at boot). Fall back to [{ code: 'en-US', label:
    // 'English' }] if localization is disabled in the config (shouldn't happen
    // in production, but guards against broken configs).
    //
    // `payload.config.localization` can be `false` (disabled) or the full
    // localization config object — guard both branches explicitly.
    const localizationConfig = payload.config.localization !== false ? payload.config.localization : undefined;

    const configLocales: LocaleOption[] =
        (localizationConfig?.locales ?? []).length > 0
            ? (localizationConfig?.locales ?? []).map((l) => {
                  // Payload Locale entries have `code: string` and
                  // `label: string | Record<string, string>`.
                  const label = typeof l.label === 'string' ? l.label : (l.label?.en ?? l.code);
                  return { code: l.code, label };
              })
            : [{ code: 'en-US', label: 'English' }];

    const defaultLocale = localizationConfig?.defaultLocale ?? 'en-US';
    const locale = configLocales.find((l) => l.code === localeParam)?.code ?? defaultLocale;

    // ── Fetch existing doc ────────────────────────────────────────────────────
    // Fetch the draft version so the editor starts from the latest in-progress
    // state, not the last published snapshot.
    const { docs } = await payload.find({
        collection: 'footer',
        where: { tenant: { equals: tenant.id } },
        limit: 1,
        // Cast to `never` — `locale` is a runtime string from Payload's own
        // localization config, but the generated TypedLocale union is narrowed
        // to exactly the codes registered in `payload-types.ts`. At runtime
        // they will always match; the cast avoids requiring us to regenerate
        // types after every locale-config change.
        locale: locale as never,
        user,
        overrideAccess: false,
        draft: true,
    });
    const existing = docs[0] ?? null;

    // ── Build Payload FormState ───────────────────────────────────────────────
    // `buildFormState` needs a PayloadRequest (i18n + user). Mirror the pattern
    // from `getCmsClientConfig` — derive language from request headers/cookies,
    // then build a local req.
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    // Attach the authenticated Payload user so access control inside
    // `buildFormState` sees the same principal that gated this route.
    const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

    const { state: initialState } = await buildCmsFormState({
        collectionSlug: 'footer',
        data: existing ?? {},
        id: existing ? String(existing.id) : undefined,
        operation: existing ? 'update' : 'create',
        // TODO(Task 14): Collections with per-field access (pages, articles) must
        // derive docPermissions from payload.docAccess({ collection, id, req }) rather
        // than passing `true`. For footer all fields are uniformly writable so
        // the shortcut is correct here.
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
        schemaPath: 'footer',
        skipValidation: true,
    });

    // ── Live preview URL (assembled server-side) ───────────────────────────────
    // Secret never crosses the RSC boundary — it's embedded in the URL string
    // which is passed as an opaque prop to the iframe component.
    const previewUrl = buildLivePreviewUrl({
        tenantId: tenant.id,
        collection: 'footer',
        data: {},
        locale,
    });

    // ── Bind domain into server actions ───────────────────────────────────────
    // `.bind(null, domain)` is the idiomatic Next 15+ pattern for threading
    // a closure arg into a server action that's passed across the RSC boundary
    // to a client component. The bound action is still a server action — Next
    // serialises the closure through the encrypted action ID.
    const boundSaveDraft = saveFooterDraftAction.bind(null, domain);
    const boundPublish = publishFooterAction.bind(null, domain);

    return (
        <DocumentForm
            title="Footer"
            breadcrumbs={[{ label: 'Content', href: `/${domain}/content/` as Route }, { label: 'Footer' }]}
            clientConfig={clientConfig}
            onSubmit={boundSaveDraft}
            initialState={initialState}
            toolbar={
                <>
                    <LocaleSwitcher locales={configLocales} currentLocale={locale} />
                    <FooterForm saveDraftAction={boundSaveDraft} publishAction={boundPublish} />
                </>
            }
            livePreview={<LivePreviewIframe previewUrl={previewUrl} domain={domain} />}
        >
            <FooterFields />
        </DocumentForm>
    );
}
