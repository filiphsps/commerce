import 'server-only';

import { createBridgeServerActions } from '@nordcom/commerce-cms/bridge';
import { shopBridge } from '@nordcom/commerce-cms/bridge/manifests';
import { BridgeEditPage, type BridgeEditPageProps } from '@nordcom/commerce-cms/bridge/ui';
import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { getCmsClientConfig } from '@/lib/get-client-config';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = {
    title: 'Edit Shop',
};

type Props = { params: Promise<{ domain: string }> };

export default async function ShopSettingsPage({ params }: Props) {
    const { domain } = await params;

    const getCtx = async (d: string) => {
        const { user } = await getAuthedPayloadCtx(d);
        return {
            user: {
                id: user.id,
                role: user.role,
                tenants: user.tenants.map((t) => t.tenant),
            },
            domain: d,
        };
    };

    // ── Fetch doc + build form state ──────────────────────────────────────────
    const doc = await shopBridge.adapter.findById(domain);
    if (!doc) notFound();

    const { payload, user } = await getAuthedPayloadCtx(domain);
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

    const { state: initialState } = await buildCmsFormState({
        collectionSlug: 'bridge:shop' as never,
        data: doc as Record<string, unknown>,
        id: domain,
        operation: 'update',
        docPermissions: { create: true, fields: true, read: true, update: true },
        docPreferences: { fields: {} },
        req,
        schemaPath: 'bridge:shop',
        skipValidation: true,
    });

    const clientConfig = await getCmsClientConfig(domain);
    const actions = createBridgeServerActions(shopBridge, getCtx);

    return (
        <BridgeEditPage
            manifest={shopBridge}
            domain={domain}
            id={domain}
            getCtx={getCtx}
            actions={actions}
            initialState={initialState}
            clientConfig={clientConfig}
            DocumentForm={DocumentForm as BridgeEditPageProps<never>['DocumentForm']}
            breadcrumbs={[{ label: 'Settings', href: `/${domain}/settings/` as unknown as Route }, { label: 'Shop' }]}
        />
    );
}
