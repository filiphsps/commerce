import 'server-only';

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { coerceMissingGroups } from '../adapter-mongoose';
import type { BridgeManifest } from '../manifest';
import { BRIDGE_COLLECTION_PREFIX } from '../plugin';
import type { BridgeCtxResolver, BridgeServerActions } from '../server-actions';
import { BridgeFields } from './bridge-fields';
import { BridgeFormToolbar } from './bridge-form-toolbar';

export type BridgeEditPageProps<TDoc> = {
    manifest: BridgeManifest<TDoc>;
    domain: string;
    id: string;
    /** Resolves auth context from a domain. Admin app supplies this — keeps cms admin-free. */
    getCtx: BridgeCtxResolver;
    /** Server-action factory result — admin app constructs and passes in. */
    actions: BridgeServerActions;
    /** Pre-built initial form state (admin app calls its own buildCmsFormState). */
    initialState: unknown;
    /** Pre-built client config (admin app calls its own getCmsClientConfig). */
    clientConfig: unknown;
    /**
     * Admin app supplies its own `<DocumentForm>` wrapper to avoid coupling
     * the cms package to admin internals. The component receives the assembled
     * pieces (title, breadcrumbs, clientConfig, initialState, onSubmit, toolbar)
     * and is responsible for rendering Payload's `<Form>` + a chrome around it.
     */
    DocumentForm: (props: {
        title: string;
        breadcrumbs: Array<{ label: string; href?: string }>;
        clientConfig: unknown;
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
    actions,
    initialState,
    clientConfig,
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

    const boundUpdate: (fd: FormData) => Promise<void> = (fd) => actions.updateAction(domain, id, fd);
    const boundDelete: () => Promise<void> = () => actions.deleteAction(domain, id);

    const title = titleFor ? titleFor(doc) : String((doc as { name?: string }).name ?? manifest.label.singular);

    // Reference BRIDGE_COLLECTION_PREFIX for consumers that inspect the synthesized slug
    // (BridgeFields uses this internally via the manifest.slug).
    void `${BRIDGE_COLLECTION_PREFIX}${manifest.slug}`;

    return (
        <DocumentForm
            title={title}
            breadcrumbs={breadcrumbs}
            clientConfig={clientConfig}
            initialState={initialState}
            onSubmit={boundUpdate}
            toolbar={<BridgeFormToolbar saveAction={boundUpdate} deleteAction={boundDelete} />}
        >
            <BridgeFields slug={manifest.slug} />
        </DocumentForm>
    );
}
