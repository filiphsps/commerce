import 'server-only';

import { shopsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata, Route } from 'next';
import { BlocksTab } from '@/components/customization/blocks-tab';
import { ComponentsTab } from '@/components/customization/components-tab';
import { CustomizationShell } from '@/components/customization/customization-shell';
import { SectionsTab } from '@/components/customization/sections-tab';
import { PreviewBridge } from '@/components/theme-editor/preview-bridge';
import { ThemeEditor } from '@/components/theme-editor/theme-editor';
import * as actions from '@/lib/cms-actions/_generated/shops';
import { editorRuntime } from '@/lib/editor-runtime';
import { buildStorefrontPreviewUrl } from '@/lib/storefront-preview';

export const metadata: Metadata = { title: 'Customization' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string; tab?: string }>;
};

/**
 * Customization hub: store-wide defaults for storefront blocks and components, plus the theme catalog,
 * under one tabbed surface. Mounts the shared editor (`shopsEditor`, singleton-by-domain) with the
 * hub as its `fieldSurface` — the Theme tab carries the existing theme editor, the Components tab the
 * store-default component settings. Both write `theme.*` / `extensions.*` form-state paths that ride
 * along into the shop upsert, so Save Draft / Publish and the live preview work for the whole hub.
 *
 * @param props.params - Route params carrying the tenant `domain`.
 * @param props.searchParams - Search params; `locale` drives the editing locale, `tab` the active hub tab.
 * @returns The Customization editor page.
 */
export default async function CustomizationPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    const previewUrl = buildStorefrontPreviewUrl({
        domain,
        collection: shopsEditor.collection,
        data: {},
        locale: sp.locale ?? 'en-US',
    });

    return (
        <EditorEditPage
            manifest={shopsEditor}
            runtime={editorRuntime}
            params={{ domain, id: domain }}
            searchParams={sp}
            selfPath={`/${domain}/settings/customization/` as Route}
            fieldSurface={
                <CustomizationShell
                    tabs={[
                        { slug: 'theme', label: 'Theme', content: <ThemeEditor /> },
                        { slug: 'components', label: 'Components', content: <ComponentsTab /> },
                        { slug: 'blocks', label: 'Blocks', content: <BlocksTab /> },
                        { slug: 'sections', label: 'Sections', content: <SectionsTab /> },
                    ]}
                />
            }
            livePreview={<PreviewBridge previewUrl={previewUrl} domain={domain} />}
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
