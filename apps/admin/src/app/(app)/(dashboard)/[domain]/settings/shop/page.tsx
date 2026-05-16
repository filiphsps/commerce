import 'server-only';

import { shopsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/shops';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit Shop' };

type Props = { params: Promise<{ domain: string }> };

export default async function ShopSettingsPage({ params }: Props) {
    const { domain } = await params;
    // Shop is keyed by domain (`singleton-by-domain` manifest), so `id === domain`.
    return (
        <EditorEditPage
            manifest={shopsEditor}
            runtime={editorRuntime}
            params={{ domain, id: domain }}
            searchParams={{}}
            generatedActions={{
                saveDraft: actions.shopsSaveDraft,
                publish: actions.shopsPublish,
                create: actions.shopsCreate,
                delete: actions.shopsDelete,
                bulkDelete: actions.shopsBulkDelete,
                bulkPublish: actions.shopsBulkPublish,
                restoreVersion: actions.shopsRestoreVersion,
            }}
        />
    );
}
