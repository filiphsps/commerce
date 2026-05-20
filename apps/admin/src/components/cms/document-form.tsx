import { PayloadFieldShell, type PayloadFieldShellProps } from '@nordcom/commerce-cms/ui';
import { Form } from '@payloadcms/ui';
import type { FormState } from 'payload';
import type { ReactNode } from 'react';

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
                    <Form action={onSubmit} initialState={initialState} isDocumentForm>
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

                        {toolbar ? (
                            <PageFooter>
                                <div className="flex w-full flex-col items-center justify-between gap-3 md:flex-row">
                                    {toolbar}
                                </div>
                            </PageFooter>
                        ) : null}
                    </Form>
                </PayloadFieldShell>
            </div>
        </div>
    );
}
