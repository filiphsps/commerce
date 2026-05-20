import 'server-only';

import { shopsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/shops';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Edit Shop' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function ShopSettingsPage({ params, searchParams }: Props) {
    const { domain } = await params;
    // Forward URL search params so EditorEditPage sees `?locale=…`. Hardcoding
    // `{}` here made the locale-coercion redirect fire on every request — the
    // browser followed it back to the same URL, which still had no searchParams
    // visible to the page, causing an infinite reload of the shop edit view.
    const sp = await searchParams;
    // Shop is keyed by domain (`singleton-by-domain` manifest), so `id === domain`.
    return (
        <EditorEditPage
            manifest={shopsEditor}
            runtime={editorRuntime}
            params={{ domain, id: domain }}
            searchParams={sp}
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
