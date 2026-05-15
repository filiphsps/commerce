'use server';

import 'server-only';

import { createCmsServerFunctionHandler } from '@nordcom/commerce-cms/server-functions';
import { getPayload, type ServerFunctionClient } from 'payload';
import payloadConfig from '@/payload.config';

// Build the handler once per server instance. `getPayload` is internally cached
// so this resolves to the same `importMap` reference that the booted Payload
// uses for every request — fields registered via custom components keep
// rendering after server-function calls (form-state, render-document, …).
const handlerPromise: Promise<ServerFunctionClient> = (async () => {
    const payload = await getPayload({ config: payloadConfig });
    return createCmsServerFunctionHandler({
        configPromise: payloadConfig,
        importMap: payload.importMap,
    });
})();

/**
 * `'use server'` entry point passed to Payload's `<ServerFunctionsProvider>`
 * via `<PayloadFieldShell>`. Dispatches to `@payloadcms/next`'s built-in
 * registry (`form-state`, `render-document`, `schedule-publish`, …).
 *
 * Server actions are encoded by Next.js as opaque action IDs at build time —
 * the wrapper has to be a top-level `'use server'` export, which is why this
 * file exists in the app rather than the shared cms package. The actual
 * dispatch implementation lives in `@nordcom/commerce-cms/server-functions`.
 */
export async function cmsServerFunction(args: Parameters<ServerFunctionClient>[0]) {
    const handler = await handlerPromise;
    return handler(args);
}
