import 'server-only';

import { mediaEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/media';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit Media' };

type Props = {
    params: Promise<{ domain: string; id: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function EditMediaPage({ params, searchParams }: Props) {
    const { domain, id } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={mediaEditor}
            runtime={editorRuntime}
            params={{ domain, id }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.mediaSaveDraft,
                publish: actions.mediaPublish,
                create: actions.mediaCreate,
                delete: actions.mediaDelete,
                bulkDelete: actions.mediaBulkDelete,
                bulkPublish: actions.mediaBulkPublish,
                restoreVersion: actions.mediaRestoreVersion,
            }}
        />
    );
}
