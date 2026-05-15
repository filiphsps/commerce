import 'server-only';

import type { Metadata, Route } from 'next';
import { headers as getHeaders } from 'next/headers';
import { notFound } from 'next/navigation';
import { createLocalReq, getLocalI18n, getRequestLanguage, type PayloadRequest } from 'payload';
import { parseCookies } from 'payload/shared';
import { DocumentForm } from '@/components/cms/document-form';
import { buildCmsFormState } from '@/lib/build-cms-form-state';
import { deleteUserAction, updateUserAction } from '@/lib/cms-actions/users';
import { getCmsClientConfig } from '@/lib/get-client-config';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';
import { UserFields } from './user-fields';
import { UserForm } from './user-form';

export const metadata: Metadata = {
    title: 'Edit User',
};

export type EditUserProps = {
    params: Promise<{ domain: string; id: string }>;
};

export default async function EditUserPage({ params }: EditUserProps) {
    const { domain, id } = await params;

    // ── Auth ──────────────────────────────────────────────────────────────────
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    // ── Client config (no tenant scoping — cross-tenant collection) ───────────
    const clientConfig = await getCmsClientConfig();

    // ── Fetch user by id ──────────────────────────────────────────────────────
    // No `draft: true` — users have no versions/drafts config.
    const userDoc = await payload.findByID({
        collection: 'users',
        id,
        user,
        overrideAccess: false,
    });

    if (!userDoc) {
        notFound();
    }

    // ── Fetch tenant options for the user-form multi-select ───────────────────
    const { docs: tenantDocs } = await payload.find({
        collection: 'tenants',
        sort: 'name',
        limit: 100,
        user,
        overrideAccess: false,
    });

    const tenantOptions = tenantDocs.map((t) => ({
        id: String(t.id),
        name: String(t.name ?? t.id),
    }));

    // ── Build Payload FormState ───────────────────────────────────────────────
    const headers = await getHeaders();
    const cookies = parseCookies(headers);
    const language = getRequestLanguage({ config: payload.config, cookies, headers });
    const i18n = (await getLocalI18n({ config: payload.config, language })) as PayloadRequest['i18n'];
    const req = await createLocalReq({ req: { i18n, user: user as never } }, payload);

    const { state: initialState } = await buildCmsFormState({
        collectionSlug: 'users',
        data: userDoc,
        id: String(userDoc.id),
        operation: 'update',
        docPermissions: {
            create: true,
            fields: true,
            read: true,
            // No `readVersions` — the users collection has no `versions:`
            // config, so there's no versions table to read. Omitting the key
            // (rather than setting `true`) avoids misleading Payload's
            // `<DocumentHeader>` into rendering a Versions tab that 404s.
            update: true,
        },
        docPreferences: { fields: {} },
        req,
        schemaPath: 'users',
        skipValidation: true,
    });

    // ── Bind domain + id into server actions ──────────────────────────────────
    const boundUpdate = updateUserAction.bind(null, domain, id);
    const boundDelete = deleteUserAction.bind(null, domain, id);

    const userTitle = String(userDoc.email ?? `User ${id}`);

    // Derive current tenant IDs from the user doc for the form's default value.
    const currentTenantIds = Array.isArray(userDoc.tenants)
        ? (userDoc.tenants as Array<{ tenant?: unknown }>)
              .map((t) => {
                  if (typeof t?.tenant === 'string') return t.tenant;
                  if (t?.tenant && typeof t.tenant === 'object' && 'id' in t.tenant) {
                      return String((t.tenant as { id: unknown }).id);
                  }
                  return '';
              })
              .filter(Boolean)
        : [];

    return (
        <DocumentForm
            title={userTitle}
            breadcrumbs={[{ label: 'Users', href: `/${domain}/settings/users/` as Route }, { label: userTitle }]}
            clientConfig={clientConfig}
            onSubmit={boundUpdate}
            initialState={initialState}
            toolbar={
                <UserForm
                    saveAction={boundUpdate}
                    deleteAction={boundDelete}
                    tenantOptions={tenantOptions}
                    currentTenantIds={currentTenantIds}
                />
            }
        >
            <UserFields />
        </DocumentForm>
    );
}
