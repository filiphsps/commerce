import 'server-only';

import { shopBridge } from '@nordcom/commerce-cms/bridge/manifests';
import { BridgeEditPage, type BridgeEditPageProps } from '@nordcom/commerce-cms/bridge/ui';
import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { shopDeleteAction, shopUpdateAction } from '@/lib/cms-actions/shop';
import { getCmsShellProps } from '@/lib/get-cms-shell-props';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = {
    title: 'Edit Shop',
};

type Props = { params: Promise<{ domain: string }> };

export default async function ShopSettingsPage({ params }: Props) {
    const { domain } = await params;
    const { payload, user } = await getAuthedPayloadCtx(domain);

    const ctx = {
        user: {
            id: user.id,
            role: user.role,
            tenants: user.tenants.map((t) => t.tenant),
        },
        domain,
    };
    if (!(await shopBridge.access.read(ctx))) notFound();

    const doc = await shopBridge.adapter.findById(domain);
    if (!doc) notFound();

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

    const shellProps = await getCmsShellProps(domain);

    // `getCtx` resolves the auth context on each call. The closure forwards
    // `domain` from the URL; never close over the page-render ctx itself —
    // bridge access checks must re-authenticate per request.
    const getCtx = async (d: string) => {
        const { user: u } = await getAuthedPayloadCtx(d);
        return {
            user: { id: u.id, role: u.role, tenants: u.tenants.map((t) => t.tenant) },
            domain: d,
        };
    };

    // `.bind(null, domain, domain)` partially applies the action's URL-derived
    // arguments. The result is still a server action — Next.js encodes the
    // bound prefix in the action ID, so the value is safe to pass to client
    // components (Payload's `<Form action>` and `<BridgeFormToolbar>`).
    // Shop is keyed by domain, so `id === domain`.
    const boundUpdate = shopUpdateAction.bind(null, domain, domain);
    const boundDelete = shopDeleteAction.bind(null, domain, domain);

    return (
        <BridgeEditPage
            manifest={shopBridge}
            domain={domain}
            id={domain}
            getCtx={getCtx}
            updateAction={boundUpdate}
            deleteAction={boundDelete}
            initialState={initialState}
            shellProps={shellProps}
            DocumentForm={DocumentForm as BridgeEditPageProps<never>['DocumentForm']}
            breadcrumbs={[{ label: 'Settings', href: `/${domain}/settings/` as unknown as Route }, { label: 'Shop' }]}
        />
    );
}
