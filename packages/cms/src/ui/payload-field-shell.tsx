'use client';

import { ModalContainer, ModalProvider } from '@faceless-ui/modal';
import { ConfigProvider, ServerFunctionsProvider, UploadHandlersProvider } from '@payloadcms/ui';
import type { ClientConfig, ServerFunctionClient } from 'payload';
import type { ReactNode } from 'react';

export type PayloadFieldShellProps = {
    /**
     * The Payload `ClientConfig` for the current request — produced by
     * `getClientConfig()` from `@payloadcms/ui/utilities/getClientConfig`.
     */
    config: ClientConfig;
    /**
     * Server action that dispatches into Payload's server-function registry
     * (form-state, render-document, schedule-publish, …). Apps build this via
     * `createCmsServerFunctionHandler` from `@nordcom/commerce-cms/server-functions`
     * wrapped in a `'use server'` module so it crosses the RSC boundary.
     *
     * Without this prop Payload's `<Form>` throws
     * "useServerFunctions must be used within a ServerFunctionsProvider" at
     * mount time — the hook reads context unconditionally.
     */
    serverFunction: ServerFunctionClient;
    children: ReactNode;
};

/**
 * Provider shell required by Payload field components and `<Form>` when
 * embedded outside the canonical `@payloadcms/next` admin shell.
 *
 * Mounts the minimum context tree `@payloadcms/ui` field internals read at
 * runtime:
 *   - `ConfigProvider` — collection schemas / translated labels.
 *   - `ServerFunctionsProvider` — `getFormState`, `renderDocument`, etc.
 *     Throws "useServerFunctions must be used within…" if missing.
 *   - `UploadHandlersProvider` — `<Form>` reads `getUploadHandler` to wire
 *     custom upload handlers. The hook throws if the provider is absent
 *     (the context defaults to `null`, and the hook null-checks).
 *   - `ModalProvider` (+ `ModalContainer`) from `@faceless-ui/modal` — upload
 *     and relationship field components mount document drawers via
 *     `useDocumentDrawer`, which reads `modalState[drawerSlug]` on every
 *     render. Without `ModalProvider`, `modalState` is undefined and the
 *     subscript access throws on the first paint of any upload field.
 *
 * The other Payload contexts (`Auth`, `Locale`, `DocumentInfo`, `Translation`,
 * `RouteTransition`, `Operation`) all use bare `use(Context)` against non-null
 * defaults, so they don't need explicit mounting for a document edit form.
 */
export function PayloadFieldShell({ config, serverFunction, children }: PayloadFieldShellProps) {
    return (
        <ConfigProvider config={config}>
            <ServerFunctionsProvider serverFunction={serverFunction}>
                <UploadHandlersProvider>
                    <ModalProvider classPrefix="payload" transTime={0} zIndex="var(--z-modal)">
                        {children}
                        <ModalContainer />
                    </ModalProvider>
                </UploadHandlersProvider>
            </ServerFunctionsProvider>
        </ConfigProvider>
    );
}
