import type { FormState } from '@nordcom/commerce-cms/editor/form';
import type { ReactNode } from 'react';

import { DocumentFormBody } from '@/components/cms/document-form-body';
import { PageFooter } from '@/components/shell/page-footer';
import { type Breadcrumb, PageHeader } from '@/components/shell/page-header';

/**
 * Opaque runtime shell-prop bag. The editor runtime seam (`EditorRuntime.getShellProps`)
 * still produces it for every page render, but nothing consumes it anymore — THEMEFIX-01
 * moved the last consumer (the theme route's Payload field shell) onto the native form
 * core. TEARDOWN-02 deletes the seam.
 */
export type CmsShellProps = Record<string, unknown>;

export type DocumentFormProps = {
    title: string;
    breadcrumbs?: Breadcrumb[];
    /** Carried for the runtime seam's call shape; unused here (see {@link CmsShellProps}). */
    shellProps: CmsShellProps;
    children: ReactNode;
    onSubmit: (formData: FormData) => Promise<void>;
    initialState?: FormState;
    toolbar?: ReactNode;
    /** Optional live-preview slot. When provided the form body uses a 2-col grid. */
    livePreview?: ReactNode;
};

/**
 * Full-page document editor layout combining a PageHeader, the native CMSFORM-01
 * form body, and an optional live-preview pane. Since CMSGATE-01 the Payload
 * field shell is GONE from this path: the native form core needs no Payload
 * providers, so every editor surface — including the theme route's bespoke
 * `fieldSurface` since THEMEFIX-01 — renders with zero `@payloadcms/*` on its
 * import graph.
 *
 * @param props.title - Page heading displayed in PageHeader.
 * @param props.breadcrumbs - Optional breadcrumb trail rendered above the title.
 * @param props.children - Field components rendered inside the form body.
 * @param props.onSubmit - Server action called on explicit form submit.
 * @param props.initialState - Native FormState used to seed the form.
 * @param props.toolbar - Optional toolbar slot rendered in the sticky PageFooter.
 * @param props.livePreview - When provided the form body switches to a two-column grid layout.
 * @returns The assembled editor page layout.
 */
export function DocumentForm({
    title,
    breadcrumbs,
    children,
    onSubmit,
    initialState,
    toolbar,
    livePreview,
}: DocumentFormProps) {
    return (
        <div className="flex h-full min-w-0 flex-col">
            <PageHeader title={title} breadcrumbs={breadcrumbs} />

            <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
                <DocumentFormBody action={onSubmit} initialState={initialState}>
                    <div
                        className={
                            livePreview
                                ? 'grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2'
                                : 'flex min-w-0 flex-col gap-4'
                        }
                    >
                        <div className="flex min-w-0 flex-col gap-4 overflow-x-auto">{children}</div>
                        {livePreview ? <div className="flex min-w-0 flex-col gap-4">{livePreview}</div> : null}
                    </div>

                    {toolbar ? <PageFooter>{toolbar}</PageFooter> : null}
                </DocumentFormBody>
            </div>
        </div>
    );
}
