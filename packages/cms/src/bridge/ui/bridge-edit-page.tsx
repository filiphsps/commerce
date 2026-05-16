import 'server-only';

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { coerceMissingGroups } from '../adapter-mongoose';
import type { BridgeManifest } from '../manifest';
import type { BridgeCtxResolver } from '../server-actions';
import { BridgeFields } from './bridge-fields';
import { BridgeFormToolbar } from './bridge-form-toolbar';

export type BridgeEditPageProps<TDoc> = {
    manifest: BridgeManifest<TDoc>;
    domain: string;
    id: string;
    /** Resolves auth context from a domain. Admin app supplies this — keeps cms admin-free. */
    getCtx: BridgeCtxResolver;
    /**
     * Pre-bound server action for save. Must be a real `'use server'` reference
     * (typically a top-level export `.bind(null, domain, id)`). Passing the
     * result of `createBridgeServerActions(...).updateAction` directly will
     * fail at the client boundary — its methods are plain async functions, not
     * action IDs, so Next.js cannot encrypt them into a transferable closure.
     */
    updateAction: (formData: FormData) => Promise<void>;
    /** Pre-bound server action for delete; see `updateAction` for the same caveat. */
    deleteAction: () => Promise<void>;
    /** Pre-built initial form state (admin app calls its own buildCmsFormState). */
    initialState: unknown;
    /**
     * Pre-built Payload shell prop bag (admin app calls its own
     * `getCmsShellProps`). Forwarded verbatim to `<DocumentForm>` so the
     * admin's `<PayloadFieldShell>` can mount `<RootProvider>` and the
     * bundled `ModalContext` field internals read from.
     */
    shellProps: unknown;
    /**
     * Admin app supplies its own `<DocumentForm>` wrapper to avoid coupling
     * the cms package to admin internals. The component receives the assembled
     * pieces (title, breadcrumbs, shellProps, initialState, onSubmit, toolbar)
     * and is responsible for rendering Payload's `<Form>` + a chrome around it.
     */
    DocumentForm: (props: {
        title: string;
        breadcrumbs: Array<{ label: string; href?: string }>;
        shellProps: unknown;
        initialState: unknown;
        onSubmit: (fd: FormData) => Promise<void>;
        toolbar: ReactNode;
        children: ReactNode;
    }) => ReactNode;
    breadcrumbs: Array<{ label: string; href?: string }>;
    /** Optional override for the page title; defaults to doc.name or manifest.label.singular. */
    titleFor?: (doc: TDoc) => string;
};

export async function BridgeEditPage<TDoc>({
    manifest,
    domain,
    id,
    getCtx,
    updateAction,
    deleteAction,
    initialState,
    shellProps,
    DocumentForm,
    breadcrumbs,
    titleFor,
}: BridgeEditPageProps<TDoc>) {
    const ctx = await getCtx(domain);
    if (!(await manifest.access.read(ctx))) notFound();

    const doc = await manifest.adapter.findById(id);
    if (!doc) notFound();

    // coerceMissingGroups is called here defensively, but the admin app's
    // buildCmsFormState already runs over the same shape; the real fix is
    // for the admin's call site to pass through this projection before
    // building form state. We compute it here so adapters returning
    // bare-bones docs don't crash <RenderFields> downstream.
    void coerceMissingGroups(
        manifest.toFormValues ? manifest.toFormValues(doc) : (doc as Record<string, unknown>),
        manifest.fields,
    );

    const title = titleFor ? titleFor(doc) : String((doc as { name?: string }).name ?? manifest.label.singular);

    return (
        <DocumentForm
            title={title}
            breadcrumbs={breadcrumbs}
            shellProps={shellProps}
            initialState={initialState}
            onSubmit={updateAction}
            toolbar={<BridgeFormToolbar saveAction={updateAction} deleteAction={deleteAction} />}
        >
            <BridgeFields slug={manifest.slug} />
        </DocumentForm>
    );
}
