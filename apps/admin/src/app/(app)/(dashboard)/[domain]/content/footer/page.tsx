import 'server-only';

import { footerEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import * as actions from '@/lib/cms-actions/_generated/footer';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Footer' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

export default async function FooterPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return (
        <EditorEditPage
            manifest={footerEditor}
            runtime={editorRuntime}
            params={{ domain, id: '' }}
            searchParams={sp}
            generatedActions={{
                saveDraft: actions.footerSaveDraft,
                publish: actions.footerPublish,
                create: actions.footerCreate,
                delete: actions.footerDelete,
                bulkDelete: actions.footerBulkDelete,
                bulkPublish: actions.footerBulkPublish,
                restoreVersion: actions.footerRestoreVersion,
            }}
        />
    );
}
