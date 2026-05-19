import 'server-only';

import { tenantsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/tenants';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'New Tenant' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function NewTenantPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorNewPage
            manifest={tenantsEditor}
            runtime={editorRuntime}
            params={{ domain }}
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
