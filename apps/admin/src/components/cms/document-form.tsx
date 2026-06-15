import type { FormState } from '@nordcom/commerce-cms/editor/form';
import type { ReactNode } from 'react';

import { DocumentFormBody } from '@/components/cms/document-form-body';
import { SplitEditorLayout } from '@/components/cms/split-editor-layout';
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
 * @param props.toolbar - Optional toolbar slot rendered in the pinned PageFooter.
 * @param props.livePreview - When provided the body becomes a two-column split with an independent-scroll preview.
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
    // The form itself is the layout container: PageHeader pins to the top, the
    // SplitEditorLayout fills the middle and owns ALL scrolling (per column, so
    // the preview iframe can't capture the page scroll), and PageFooter sits as
    // the last flex item — always visible without any sticky/viewport-height
    // hack. `min-h-0` lets the scroll regions shrink instead of overflowing.
    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col">
            <PageHeader title={title} breadcrumbs={breadcrumbs} />

            <DocumentFormBody
                action={onSubmit}
                initialState={initialState}
                className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
                <SplitEditorLayout preview={livePreview}>{children}</SplitEditorLayout>
                {toolbar ? (
                    <PageFooter sticky={false} className="shrink-0">
                        {toolbar}
                    </PageFooter>
                ) : null}
            </DocumentFormBody>
        </div>
    );
}
