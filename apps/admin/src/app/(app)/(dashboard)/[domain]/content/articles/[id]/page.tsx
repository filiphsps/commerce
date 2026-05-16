import 'server-only';

import { articlesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/articles';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit Article' };

type Props = {
    params: Promise<{ domain: string; id: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditArticlePage({ params, searchParams }: Props) {
    const { domain, id } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={articlesEditor}
            runtime={editorRuntime}
            params={{ domain, id }}
            searchParams={sp}
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
