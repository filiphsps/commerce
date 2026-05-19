import 'server-only';

import { usersEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/users';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'New User' };

export default async function NewUserPage({ params }: { params: Promise<{ domain: string }> }) {
    const { domain } = await params;
    return (
        <EditorNewPage
            manifest={usersEditor}
            runtime={editorRuntime}
            params={{ domain }}
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
