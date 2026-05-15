import { payloadHooks } from '@tagtree/payload';
import type { CollectionConfig } from 'payload';

export type RevalidateHookOptions = { collection: string };

/**
 * Adapter that maps the existing `buildRevalidateHooks({ collection })` call
 * sites onto `@tagtree/payload`. The `collection` name doubles as the schema
 * entity name (the CMS schema declares one entity per Payload collection).
 *
 * `cmsCache` is dynamically imported inside the returned hook callbacks. The
 * cache module pulls in `server-only` (transitively via `@tagtree/next`),
 * which throws when evaluated outside a Next.js bundler — notably during
 * `payload generate:types`, which loads the config via `tsx` in plain Node
 * with no bundler to redirect `server-only` to its no-op stub. Deferring the
 * import keeps the surrounding collection module graph importable in those
 * contexts; the hooks themselves only ever fire on the server.
 */
export const buildRevalidateHooks = ({ collection }: RevalidateHookOptions): NonNullable<CollectionConfig['hooks']> => {
    let hooksPromise: Promise<NonNullable<CollectionConfig['hooks']>> | undefined;
    const getHooks = (): Promise<NonNullable<CollectionConfig['hooks']>> => {
        hooksPromise ??= import('../../cache').then(({ cmsCache }) => payloadHooks(cmsCache, { entity: collection }));
        return hooksPromise;
    };

    return {
        afterChange: [
            async (args) => {
                const hooks = await getHooks();
                return hooks.afterChange?.[0]?.(args) ?? args.doc;
            },
        ],
        afterDelete: [
            async (args) => {
                const hooks = await getHooks();
                await hooks.afterDelete?.[0]?.(args);
            },
        ],
    };
};
