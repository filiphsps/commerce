import 'server-only';

import { mediaEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorListPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Media' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ page?: string }>;
};

export default async function MediaListPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return <EditorListPage manifest={mediaEditor} runtime={editorRuntime} params={{ domain }} searchParams={sp} />;
}
