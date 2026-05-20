import 'server-only';

import { usersEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorListPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata } from 'next';
import { editorRuntime } from '@/lib/editor-runtime';

export const metadata: Metadata = { title: 'Users' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ page?: string; locale?: string }>;
};

export default async function ShopSettingsUsersPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    return <EditorListPage manifest={usersEditor} runtime={editorRuntime} params={{ domain }} searchParams={sp} />;
}
