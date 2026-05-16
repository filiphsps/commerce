import 'server-only';

import { businessDataEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorVersionsPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/businessData';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Business data — Versions' };

export default async function BusinessDataVersionsPage({ params }: { params: Promise<{ domain: string }> }) {
    const { domain } = await params;
    return (
        <EditorVersionsPage
            manifest={businessDataEditor}
            runtime={editorRuntime}
            params={{ domain, id: 'singleton' }}
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
