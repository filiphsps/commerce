import 'server-only';

import { pagesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/pages';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'New Page' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function NewPagePage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorNewPage
            manifest={pagesEditor}
            runtime={editorRuntime}
            params={{ domain }}
            searchParams={sp}
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
