import { Form } from '@payloadcms/ui';
import type { Route } from 'next';
import Link from 'next/link';
import type { ClientConfig, FormState } from 'payload';
import type { ReactNode } from 'react';

import { PayloadFieldShell } from '@/components/cms/payload-field-shell';

/** A single item in the breadcrumb trail. The last item is rendered without a link. */
export type Breadcrumb = { label: string; href?: Route };

export type DocumentFormProps = {
    /** Page title shown in the header (e.g. "Edit Article: Hello World"). */
    title: string;
    /**
     * Optional breadcrumb trail rendered above the title.
     * Items with `href` are rendered as links; the last item is rendered plain.
     */
    breadcrumbs?: Breadcrumb[];
    /**
     * `ClientConfig` from `getCmsClientConfig()` — forwarded to `<PayloadFieldShell>`
     * so all Payload UI field components receive the config they need.
     */
    clientConfig: ClientConfig;
    /**
     * Form field children — typically `<RenderFields fields={…} />` from `@payloadcms/ui`.
     * Rendered inside Payload's `<Form>` so field components can read form context.
     */
    children: ReactNode;
    /**
     * Server action invoked on form submit. Must accept `FormData` — Payload's
     * `<Form>` calls the action with `FormData` when `action` is a function.
     *
     * **Must be a server action**: declare with `'use server'` (inline directive
     * or imported from a `'use server'` module). A plain async function fails at
     * runtime when Payload's `<Form action={...}>` tries to invoke it.
     */
    onSubmit: (formData: FormData) => Promise<void>;
    /**
     * Initial Payload `FormState` (e.g. from `buildStateFromSchema`).
     * When omitted, Payload's `<Form>` starts with an empty state.
     */
    initialState?: FormState;
    /**
     * Sticky bottom slot — mount `<DraftPublishToolbar>` and/or `<LocaleSwitcher>` here.
     * Rendered inside a `sticky bottom-0` bar below the form body.
     */
    toolbar?: ReactNode;
    /**
     * Optional live-preview slot (Task 7).
     * When provided the layout switches to a two-column grid: form on the left,
     * preview on the right.
     */
    livePreview?: ReactNode;
};

/**
 * Server-component scaffold for every Payload document edit route.
 *
 * Renders:
 *   1. A page header with title and optional breadcrumb trail.
 *   2. The form body (children wrapped in `<PayloadFieldShell>` + Payload `<Form>`).
 *      Switches to a two-column layout when `livePreview` is provided.
 *   3. A sticky bottom toolbar bar for `<DraftPublishToolbar>` / `<LocaleSwitcher>`.
 */
export function DocumentForm({
    title,
    breadcrumbs,
    clientConfig,
    children,
    onSubmit,
    initialState,
    toolbar,
    livePreview,
}: DocumentFormProps) {
    // `min-h-[calc(100vh-4.5rem)]` makes the outer container — the `sticky`
    // containing block — at least as tall as the viewport minus the dashboard
    // header (4.5rem; see `apps/admin/src/app/(app)/(dashboard)/[domain]/layout.tsx`).
    // Without this, on short documents `sticky bottom-0` pins to the form
    // container's bottom (just under the fields) rather than the viewport floor.
    return (
        <div className="flex min-h-[calc(100vh-4.5rem)] grow flex-col gap-4">
            {/* ── Header ── */}
            <header className="flex flex-col gap-1">
                {breadcrumbs && breadcrumbs.length > 0 ? (
                    <nav aria-label="Breadcrumb">
                        <ol className="flex items-center gap-1 text-muted-foreground text-sm">
                            {breadcrumbs.map((crumb, i) => {
                                const isLast = i === breadcrumbs.length - 1;
                                return (
                                    <li key={i} className="flex items-center gap-1">
                                        {i > 0 ? <span aria-hidden="true">/</span> : null}
                                        {crumb.href && !isLast ? (
                                            <Link href={crumb.href} className="hover:text-foreground hover:underline">
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span className={isLast ? 'text-foreground' : undefined}>
                                                {crumb.label}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </nav>
                ) : null}
                <h1 className="font-semibold text-2xl leading-tight">{title}</h1>
            </header>

            {/* ── Form body (with optional live-preview split) ──
                  `flex-1` lets the body soak up vertical space so the sticky
                  toolbar gets pushed to the viewport bottom on short documents.
                  The toolbar is rendered INSIDE <Form> so client components in
                  the toolbar slot (e.g. <BusinessDataForm>) can call useForm()
                  and useAllFormFields() to read live field state. */}
            <div className={livePreview ? 'grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2' : 'flex-1'}>
                <div className="flex flex-col gap-4">
                    <PayloadFieldShell config={clientConfig}>
                        <Form action={onSubmit} initialState={initialState} isDocumentForm>
                            <div className="flex flex-col gap-4">{children}</div>

                            {/* ── Sticky bottom toolbar (inside Form) ── */}
                            {toolbar ? (
                                <div className="sticky bottom-0 z-10 border-border border-t bg-background p-4">
                                    <div className="flex items-center justify-between">{toolbar}</div>
                                </div>
                            ) : null}
                        </Form>
                    </PayloadFieldShell>
                </div>

                {livePreview ? <div className="flex flex-col gap-4">{livePreview}</div> : null}
            </div>
        </div>
    );
}
