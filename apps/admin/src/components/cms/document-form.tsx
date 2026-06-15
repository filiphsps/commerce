import type { FormState } from '@nordcom/commerce-cms/editor/form';
import type { ReactNode } from 'react';

import { DocumentFormBody } from '@/components/cms/document-form-body';
import { PageFooter } from '@/components/shell/page-footer';
import { type Breadcrumb, PageHeader } from '@/components/shell/page-header';

export type DocumentFormProps = {
    title: string;
    breadcrumbs?: Breadcrumb[];
    children: ReactNode;
    onSubmit: (formData: FormData) => Promise<void>;
    initialState?: FormState;
    toolbar?: ReactNode;
    /** Optional live-preview slot. When provided the form body uses a 2-col grid. */
    livePreview?: ReactNode;
};

/**
 * Full-page document editor layout combining a PageHeader, the native CMSFORM-01
 * form body, and an optional live-preview pane. The native form core needs no
 * CMS-framework providers — every editor surface, including the theme route's
 * bespoke `fieldSurface`, renders from the form core alone.
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

            <div className="min-w-0 flex-1 overflow-y-auto">
                <DocumentFormBody action={onSubmit} initialState={initialState}>
                    <div
                        className={
                            livePreview
                                ? // Editor + preview: fields left, preview right (sticky on lg+ so it
                                  // stays in view while the field column scrolls). Slightly favors the
                                  // preview so the storefront renders at a realistic width.
                                  'mx-auto grid min-w-0 max-w-[120rem] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'
                                : // Fields only: a single readable column, centered.
                                  'mx-auto flex min-w-0 max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6'
                        }
                    >
                        <div className="flex min-w-0 flex-col gap-5">{children}</div>
                        {livePreview ? (
                            <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">{livePreview}</div>
                        ) : null}
                    </div>

                    {toolbar ? <PageFooter>{toolbar}</PageFooter> : null}
                </DocumentFormBody>
            </div>
        </div>
    );
}
