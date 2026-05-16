import 'server-only';

import { pagesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/pages';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit Page' };

type Props = {
    params: Promise<{ domain: string; id: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditPagePage({ params, searchParams }: Props) {
    const { domain, id } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={pagesEditor}
            runtime={editorRuntime}
            params={{ domain, id }}
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
