import 'server-only';

import { tenantsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorListPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Tenants' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ page?: string; locale?: string }>;
};

export default async function TenantsListPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return <EditorListPage manifest={tenantsEditor} runtime={editorRuntime} params={{ domain }} searchParams={sp} />;
}
