import type { FormState } from '@nordcom/commerce-cms/editor/form';
import { PayloadFieldShell, type PayloadFieldShellProps } from '@nordcom/commerce-cms/ui';
import type { ReactNode } from 'react';

import { DocumentFormBody } from '@/components/cms/document-form-body';
import { PageFooter } from '@/components/shell/page-footer';
import { type Breadcrumb, PageHeader } from '@/components/shell/page-header';

export type CmsShellProps = Omit<PayloadFieldShellProps, 'children'>;

export type DocumentFormProps = {
    title: string;
    breadcrumbs?: Breadcrumb[];
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
 * form body, and an optional live-preview pane. The Payload field shell is still
 * mounted around the body as a TEMPORARY provider adapter — legacy Payload field
 * widgets that survive until CMSDATA-07's surface rebind read its contexts;
 * the native form core itself does not.
 *
 * @param props.title - Page heading displayed in PageHeader.
 * @param props.breadcrumbs - Optional breadcrumb trail rendered above the title.
 * @param props.shellProps - Props forwarded to PayloadFieldShell (Payload context providers).
 * @param props.children - Field components rendered inside the form body.
 * @param props.onSubmit - Server action called on explicit form submit.
 * @param props.initialState - Native FormState used to seed the form.
 * @param props.toolbar - Optional toolbar slot rendered in the sticky PageFooter.
 * @param props.livePreview - When provided the form body switches to a two-column grid layout.
 */
export function DocumentForm({
    title,
    breadcrumbs,
    shellProps,
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
                <PayloadFieldShell {...shellProps}>
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
                </PayloadFieldShell>
            </div>
        </div>
    );
}
