import 'server-only';

import { pagesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/pages';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'New Page' };

export default async function NewPagePage({ params }: { params: Promise<{ domain: string }> }) {
    const { domain } = await params;
    return (
        <EditorNewPage
            manifest={pagesEditor}
            runtime={editorRuntime}
            params={{ domain }}
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
