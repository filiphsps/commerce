import 'server-only';

import { productMetadataEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/productMetadata';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit product metadata' };

type Props = {
    params: Promise<{ domain: string; handle: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function ProductMetadataEditPage({ params, searchParams }: Props) {
    const { domain, handle } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={productMetadataEditor}
            runtime={editorRuntime}
            params={{ domain, id: handle }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.productMetadataSaveDraft,
                publish: actions.productMetadataPublish,
                create: actions.productMetadataCreate,
                delete: actions.productMetadataDelete,
                bulkDelete: actions.productMetadataBulkDelete,
                bulkPublish: actions.productMetadataBulkPublish,
                restoreVersion: actions.productMetadataRestoreVersion,
            }}
        />
    );
}
