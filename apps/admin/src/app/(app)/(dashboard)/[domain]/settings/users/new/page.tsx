import 'server-only';

import { usersEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/users';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'New User' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function NewUserPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorNewPage
            manifest={usersEditor}
            runtime={editorRuntime}
            params={{ domain }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.usersSaveDraft,
                publish: actions.usersPublish,
                create: actions.usersCreate,
                delete: actions.usersDelete,
                bulkDelete: actions.usersBulkDelete,
                bulkPublish: actions.usersBulkPublish,
                restoreVersion: actions.usersRestoreVersion,
            }}
        />
    );
}
