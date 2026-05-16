import type { CollectionConfig, Config, Plugin } from 'payload';
import { assertFieldsValid, assertUniqueSlugs, type BridgeManifest } from './manifest';

export const BRIDGE_COLLECTION_PREFIX = 'bridge:';

const denyAll = () => false;

const synthesizeCollection = (manifest: BridgeManifest): CollectionConfig => ({
    slug: `${BRIDGE_COLLECTION_PREFIX}${manifest.slug}`,
    admin: { hidden: true, useAsTitle: 'name' },
    access: {
        read: denyAll,
        create: denyAll,
        update: denyAll,
        delete: denyAll,
    },
    fields: manifest.fields,
});

export const buildBridgePlugin = (manifests: readonly BridgeManifest[]): Plugin => {
    return async (incoming: Config): Promise<Config> => {
        assertUniqueSlugs(manifests);
        assertFieldsValid(manifests);

        const synthesized = manifests.map(synthesizeCollection);

        return {
            ...incoming,
            collections: [...(incoming.collections ?? []), ...synthesized],
            custom: {
                ...(incoming.custom ?? {}),
                bridges: manifests,
            },
        };
    };
};
