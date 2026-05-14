import { payloadHooks } from '@tagtree/payload';
import type { CollectionConfig } from 'payload';
import { cmsCache } from '../../cache';

export type RevalidateHookOptions = { collection: string };

/**
 * Adapter that maps the existing `buildRevalidateHooks({ collection })` call
 * sites onto `@tagtree/payload`. The `collection` name doubles as the schema
 * entity name (the CMS schema declares one entity per Payload collection).
 */
export const buildRevalidateHooks = ({ collection }: RevalidateHookOptions): NonNullable<CollectionConfig['hooks']> => {
    return payloadHooks(cmsCache, { entity: collection });
};
