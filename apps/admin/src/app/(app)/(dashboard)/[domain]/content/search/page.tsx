import 'server-only';

import { searchEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/search';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Search' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function SearchPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={searchEditor}
            runtime={editorRuntime}
            params={{ domain, id: '' }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.searchSaveDraft,
                publish: actions.searchPublish,
                create: actions.searchCreate,
                delete: actions.searchDelete,
                bulkDelete: actions.searchBulkDelete,
                bulkPublish: actions.searchBulkPublish,
                restoreVersion: actions.searchRestoreVersion,
            }}
        />
    );
}
