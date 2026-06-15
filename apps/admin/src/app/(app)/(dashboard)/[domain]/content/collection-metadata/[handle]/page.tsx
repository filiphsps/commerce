import 'server-only';

import { collectionMetadataEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/collectionMetadata';
import { contentLivePreview } from '@/lib/content-live-preview';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit collection metadata' };

type Props = {
    params: Promise<{ domain: string; handle: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function CollectionMetadataEditPage({ params, searchParams }: Props) {
    const { domain, handle } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={collectionMetadataEditor}
            runtime={editorRuntime}
            params={{ domain, id: handle }}
            searchParams={sp}
            renderLivePreview={contentLivePreview}
            generatedActions={{
                saveDraft: actions.collectionMetadataSaveDraft,
                publish: actions.collectionMetadataPublish,
                create: actions.collectionMetadataCreate,
                delete: actions.collectionMetadataDelete,
                bulkDelete: actions.collectionMetadataBulkDelete,
                bulkPublish: actions.collectionMetadataBulkPublish,
                restoreVersion: actions.collectionMetadataRestoreVersion,
            }}
        />
    );
}
