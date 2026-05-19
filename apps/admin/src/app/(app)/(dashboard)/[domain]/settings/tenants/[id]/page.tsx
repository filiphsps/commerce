import 'server-only';

import { tenantsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/tenants';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit Tenant' };

type Props = {
    params: Promise<{ domain: string; id: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditTenantPage({ params, searchParams }: Props) {
    const { domain, id } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={tenantsEditor}
            runtime={editorRuntime}
            params={{ domain, id }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.tenantsSaveDraft,
                publish: actions.tenantsPublish,
                create: actions.tenantsCreate,
                delete: actions.tenantsDelete,
                bulkDelete: actions.tenantsBulkDelete,
                bulkPublish: actions.tenantsBulkPublish,
                restoreVersion: actions.tenantsRestoreVersion,
            }}
        />
    );
}
