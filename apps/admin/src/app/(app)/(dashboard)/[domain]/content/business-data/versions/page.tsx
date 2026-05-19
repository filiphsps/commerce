import 'server-only';

import { businessDataEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorVersionsPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/businessData';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Business data — Versions' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function BusinessDataVersionsPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorVersionsPage
            manifest={businessDataEditor}
            runtime={editorRuntime}
            params={{ domain, id: 'singleton' }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.businessDataSaveDraft,
                publish: actions.businessDataPublish,
                create: actions.businessDataCreate,
                delete: actions.businessDataDelete,
                bulkDelete: actions.businessDataBulkDelete,
                bulkPublish: actions.businessDataBulkPublish,
                restoreVersion: actions.businessDataRestoreVersion,
            }}
        />
    );
}
