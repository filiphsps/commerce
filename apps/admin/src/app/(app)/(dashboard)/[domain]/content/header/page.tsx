import 'server-only';

import { headerEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/header';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Header' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function HeaderPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={headerEditor}
            runtime={editorRuntime}
            params={{ domain, id: 'singleton' }}
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
