import 'server-only';

import type { EditorRuntime } from '@nordcom/commerce-cms/editor';
import { CollectionTable } from '@/components/cms/collection-table';
import { DocumentForm } from '@/components/cms/document-form';
import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
import { EmptyState } from '@/components/shell/empty-state';
import { PageHeader } from '@/components/shell/page-header';
import { buildCmsFormState } from './build-cms-form-state';
import { getCmsShellProps } from './get-cms-shell-props';
import { getAuthedPayloadCtx } from './payload-ctx';

/**
 * Single per-app runtime bundle passed into every editor primitive.
 *
 * Built once at module import; consumed via
 * `<EditorEditPage runtime={editorRuntime} ... />`.
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
    buildFormState: buildCmsFormState as never,
    getShellProps: async (domain, locale) => getCmsShellProps(domain ?? undefined, locale),
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
