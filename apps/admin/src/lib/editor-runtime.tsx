import 'server-only';

import { buildInitialFormState, type EditorRuntime } from '@nordcom/commerce-cms/editor';
import { CollectionTable } from '@/components/cms/collection-table';
import { DocumentForm } from '@/components/cms/document-form';
import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
import { EmptyState } from '@/components/shell/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { createMediaAction } from './cms-actions/media-upload';
import { editorConvexBridge } from './editor-convex-bridge';
import { getAuthedPayloadCtx } from './payload-ctx';

/**
 * Single per-app runtime bundle passed into every editor primitive.
 *
 * Built once at module import; consumed via
 * `<EditorEditPage runtime={editorRuntime} ... />`. Form state resolves
 * through the native CMSFORM-01 core (`buildInitialFormState`) and writes
 * post through the CMSDATA-05 Convex bridge (`convex`) — neither path touches
 * Payload's `buildFormState` or local API anymore.
 */
export const editorRuntime: EditorRuntime = {
    getCtx: async (domain) => {
        const { payload, user, tenant } = await getAuthedPayloadCtx(domain ?? undefined);
        return { payload, user, tenant };
    },
    toAccessCtx: (ctx, domain) => ({
        user: ctx.user
            ? {
                  id: ctx.user.id,
                  email: ctx.user.email,
                  role: ctx.user.role,
                  tenants: ctx.user.tenants.map((t) => t.tenant),
              }
            : null,
        domain,
        tenantId: ctx.tenant?.id ?? null,
    }),
    buildFormState: async ({ data }) => ({ state: buildInitialFormState(data) }),
    // The shell-prop bag is empty since CMSGATE-01: `DocumentForm` no longer
    // mounts the Payload field shell, so building the Payload client config
    // here would only drag `@payloadcms/ui` back onto every editor page's
    // import graph. The one remaining consumer — the theme route's bespoke
    // field surface — calls `getCmsShellProps` itself.
    getShellProps: async () => ({}),
    convex: editorConvexBridge,
    // A direct server-action reference, NOT a wrapper: the edit pages close
    // over it inside their inline bound upload actions, and only a registered
    // action reference serializes across that closure boundary.
    mediaUploadAction: createMediaAction,
    // Breadcrumb hrefs are `string` on the runtime seam but Next `Route`s in the
    // shell components; the casts below bridge that boundary (same pattern as
    // EmptyState's actionHref).
    DocumentForm: DocumentForm as never,
    // actionHref is typed as `string` in EditorRuntime (cms package stays free of
    // Next's typed-routes plumbing); cast to `never` bridges string ↔ Route at the boundary.
    EmptyState: ({ label, description, actionLabel, actionHref }) => (
        <EmptyState
            label={label}
            description={description}
            actionLabel={actionLabel}
            actionHref={actionHref as never}
        />
    ),
    Table: CollectionTable,
    Toolbar: DraftPublishToolbar as never,
    PageHeader: PageHeader as never,
};
