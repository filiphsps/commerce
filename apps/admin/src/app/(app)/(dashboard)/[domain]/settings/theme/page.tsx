import 'server-only';

import { shopsEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import type { Metadata, Route } from 'next';
import { PreviewBridge } from '@/components/theme-editor/preview-bridge';
import { ThemeEditor } from '@/components/theme-editor/theme-editor';
import * as actions from '@/lib/cms-actions/_generated/shops';
import { editorRuntime } from '@/lib/editor-runtime';
import { buildStorefrontPreviewUrl } from '@/lib/storefront-preview';

export const metadata: Metadata = { title: 'Theme Editor' };

type Props = {
    params: Promise<{ domain: string }>;
    searchParams: Promise<{ locale?: string }>;
};

/**
 * Theme-editor route for a shop. Reuses the same `EditorEditPage` host and the
 * generated `shopsSaveDraft`/`shopsPublish` actions as the shop settings page,
 * but swaps the auto-rendered field tree for the bespoke `<ThemeEditor>` field
 * surface so the `theme.*` subtree is owned by exactly one editor. The shop
 * route omits the `theme` group (`omitPaths={['theme']}`) to avoid two editors
 * writing the same paths.
 *
 * Because it reuses the `shops` manifest off its canonical `/settings/shop/`
 * path, it passes `selfPath` so `EditorEditPage`'s locale-coercion redirect
 * (which fires whenever `?locale=` is absent, e.g. the subnav link) returns to
 * this route instead of ejecting to the shop settings page.
 *
 * @param props.params - Route params resolving to the tenant `domain`.
 * @param props.searchParams - Forwarded so `EditorEditPage` sees `?locale=…`
 *   instead of looping on its locale-coercion redirect.
 * @returns The editor page hosting the theme editor as its field surface.
 */
export default async function ThemeSettingsPage({ params, searchParams }: Props) {
    const { domain } = await params;
    const sp = await searchParams;
    // Built server-side: the URL embeds the storefront preview secret, so it is
    // assembled in this RSC and handed down as an opaque string. The `shops`
    // collection isn't a content type, so the builder previews the tenant's
    // storefront home (`/<locale>/`). On the first request `sp.locale` may be
    // absent, but `EditorEditPage` redirects to the tenant default before this
    // URL ever renders, so the fallback locale here is never user-visible.
    const previewUrl = buildStorefrontPreviewUrl({
        domain,
        collection: shopsEditor.collection,
        data: {},
        locale: sp.locale ?? 'en-US',
    });
    // Shop is keyed by domain (`singleton-by-domain` manifest), so `id === domain`.
    return (
        <EditorEditPage
            manifest={shopsEditor}
            runtime={editorRuntime}
            params={{ domain, id: domain }}
            searchParams={sp}
            selfPath={`/${domain}/settings/theme/` as Route}
            fieldSurface={<ThemeEditor />}
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
