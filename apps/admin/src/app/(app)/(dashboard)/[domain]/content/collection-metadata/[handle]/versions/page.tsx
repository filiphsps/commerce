import 'server-only';

import { collectionMetadataEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorVersionsPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/collectionMetadata';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Collection metadata — Versions' };

type Props = {
    params: Promise<{ domain: string; handle: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function CollectionMetadataVersionsPage({ params, searchParams }: Props) {
    const { domain, handle } = await params;
    const sp = await searchParams;
    return (
        <EditorVersionsPage
            manifest={collectionMetadataEditor}
            runtime={editorRuntime}
            params={{ domain, id: handle }}
            searchParams={sp}
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
