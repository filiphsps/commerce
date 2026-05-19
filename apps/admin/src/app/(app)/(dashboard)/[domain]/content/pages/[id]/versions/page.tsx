import 'server-only';

import { pagesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorVersionsPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/pages';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Page — Versions' };

export default async function PageVersionsPage({ params }: { params: Promise<{ domain: string; id: string }> }) {
    const { domain, id } = await params;
    return (
        <EditorVersionsPage
            manifest={pagesEditor}
            runtime={editorRuntime}
            params={{ domain, id }}
            generatedActions={{
                saveDraft: actions.pagesSaveDraft,
                publish: actions.pagesPublish,
                create: actions.pagesCreate,
                delete: actions.pagesDelete,
                bulkDelete: actions.pagesBulkDelete,
                bulkPublish: actions.pagesBulkPublish,
                restoreVersion: actions.pagesRestoreVersion,
            }}
        />
    );
}
