import 'server-only';

import { headerEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorVersionsPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/header';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Header — Versions' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function HeaderVersionsPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorVersionsPage
            manifest={headerEditor}
            runtime={editorRuntime}
            params={{ domain, id: '' }}
            searchParams={sp}
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
