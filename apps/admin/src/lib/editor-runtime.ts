import 'server-only';

import type { EditorRuntime } from '@nordcom/commerce-cms/editor';
import { CollectionTable } from '@/components/cms/collection-table';
import { DocumentForm } from '@/components/cms/document-form';
import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
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
    }),
    buildFormState: buildCmsFormState as never,
    getShellProps: async (domain) => getCmsShellProps(domain ?? undefined),
    DocumentForm: DocumentForm as never,
    Table: CollectionTable as never,
    Toolbar: DraftPublishToolbar as never,
};
