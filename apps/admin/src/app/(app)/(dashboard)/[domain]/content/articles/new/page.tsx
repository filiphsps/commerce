import 'server-only';

import { articlesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/articles';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'New Article' };

export default async function NewArticlePage({ params }: { params: Promise<{ domain: string }> }) {
    const { domain } = await params;
    return (
        <EditorNewPage
            manifest={articlesEditor}
            runtime={editorRuntime}
            params={{ domain }}
            generatedActions={{
                saveDraft: actions.articlesSaveDraft,
                publish: actions.articlesPublish,
                create: actions.articlesCreate,
                delete: actions.articlesDelete,
                bulkDelete: actions.articlesBulkDelete,
                bulkPublish: actions.articlesBulkPublish,
                restoreVersion: actions.articlesRestoreVersion,
            }}
        />
    );
}
