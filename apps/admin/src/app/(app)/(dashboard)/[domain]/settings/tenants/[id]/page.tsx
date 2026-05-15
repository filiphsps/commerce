import 'server-only';

import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { deleteTenantAction, updateTenantAction } from '@/lib/cms-actions/tenants';
import { getCmsClientConfig } from '@/lib/get-client-config';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { TenantFields } from './tenant-fields';
import { TenantForm } from './tenant-form';

export const metadata: Metadata = {
    title: 'Edit Tenant',
};

export type EditTenantProps = {
    params: Promise<{ domain: string; id: string }>;
};

export default async function EditTenantPage({ params }: EditTenantProps) {
    const { domain, id } = await params;

    // ── Auth ──────────────────────────────────────────────────────────────────
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    // ── Client config (no tenant scoping — cross-tenant collection) ───────────
    const clientConfig = await getCmsClientConfig();

    // ── Fetch tenant by id ────────────────────────────────────────────────────
    // No `draft: true` — tenants have no versions/drafts config.
    const tenant = await payload.findByID({
        collection: 'tenants',
        id,
        user,
        overrideAccess: false,
    });

    if (!tenant) {
        notFound();
    }

    // ── Build Payload FormState ───────────────────────────────────────────────
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

    const { state: initialState } = await buildCmsFormState({
        collectionSlug: 'tenants',
        data: tenant,
        id: String(tenant.id),
        operation: 'update',
        docPermissions: {
            create: true,
            fields: true,
            read: true,
            // No `readVersions` — the tenants collection has no `versions:`
            // config, so there's no versions table to read. Omitting the key
            // (rather than setting `true`) avoids misleading Payload's
            // `<DocumentHeader>` into rendering a Versions tab that 404s.
            update: true,
        },
        docPreferences: { fields: {} },
        req,
        schemaPath: 'tenants',
        skipValidation: true,
    });

    // ── Bind domain + id into server actions ──────────────────────────────────
    const boundUpdate = updateTenantAction.bind(null, domain, id);
    const boundDelete = deleteTenantAction.bind(null, domain, id);

    const tenantTitle = String(tenant.name ?? `Tenant ${id}`);

    return (
        <DocumentForm
            title={tenantTitle}
            breadcrumbs={[{ label: 'Tenants', href: `/${domain}/settings/tenants/` as Route }, { label: tenantTitle }]}
            clientConfig={clientConfig}
            onSubmit={boundUpdate}
            initialState={initialState}
            toolbar={<TenantForm saveAction={boundUpdate} deleteAction={boundDelete} />}
        >
            <TenantFields />
        </DocumentForm>
    );
}
