import 'server-only';

import { headerEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorVersionsPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/header';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Header — Versions' };

export default async function HeaderVersionsPage({ params }: { params: Promise<{ domain: string }> }) {
    const { domain } = await params;
    return (
        <EditorVersionsPage
            manifest={headerEditor}
            runtime={editorRuntime}
            params={{ domain, id: 'singleton' }}
            generatedActions={{
                saveDraft: actions.headerSaveDraft,
                publish: actions.headerPublish,
                create: actions.headerCreate,
                delete: actions.headerDelete,
                bulkDelete: actions.headerBulkDelete,
                bulkPublish: actions.headerBulkPublish,
                restoreVersion: actions.headerRestoreVersion,
            }}
        />
    );
}
