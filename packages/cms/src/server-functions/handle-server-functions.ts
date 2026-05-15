import 'server-only';

import { handleServerFunctions } from '@payloadcms/next/layouts';
import type { ImportMap, SanitizedConfig, ServerFunctionClient } from 'payload';

export type CreateCmsServerFunctionHandlerArgs = {
    /**
     * The Payload config (or a promise that resolves to one).
     *
     * Apps usually pass the `default export` of their `payload.config.ts` —
     * `getPayload` and `handleServerFunctions` both accept the same value.
     */
    configPromise: Promise<SanitizedConfig> | SanitizedConfig;
    /**
     * The generated import map that resolves custom field component IDs to
     * their React modules. Usually `(await getPayload({ config })).importMap`.
     */
    importMap: ImportMap;
};

/**
 * Build a `ServerFunctionClient` that dispatches the request to
 * `@payloadcms/next`'s built-in server-function registry (form-state,
 * render-document, schedule-publish, slugify, etc.).
 *
 * The returned function is what Payload's `<ServerFunctionsProvider>` expects
 * for its `serverFunction` prop. The caller is responsible for wrapping it in
 * a `'use server'` module so it crosses the RSC boundary as a server action.
 *
 * Lives in `packages/cms` (rather than in each app) so multi-tenant admin and
 * future apps that embed Payload UI fields share one wiring. The actual
 * `'use server'` export must stay in the app — server actions cannot be built
 * by factories at module load, so each app declares a thin wrapper that
 * imports its own `payload.config` and forwards to this handler.
 */
export function createCmsServerFunctionHandler({
    configPromise,
    importMap,
}: CreateCmsServerFunctionHandlerArgs): ServerFunctionClient {
    return async (args) =>
        handleServerFunctions({
            ...args,
            config: configPromise,
            importMap,
        });
}
