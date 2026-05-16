import type { CollectionConfig, Config, Plugin } from 'payload';
import { assertFieldsValid, assertUniqueSlugs, type BridgeManifest } from './manifest';

export const BRIDGE_COLLECTION_PREFIX = 'bridge:';

const denyAll = () => false;

const synthesizeCollection = (manifest: BridgeManifest): CollectionConfig => ({
    slug: `${BRIDGE_COLLECTION_PREFIX}${manifest.slug}`,
    admin: { hidden: true },
    access: {
        read: denyAll,
        create: denyAll,
        update: denyAll,
        delete: denyAll,
    },
    fields: manifest.fields,
});

const assertNoPrefixCollision = (incoming: Config): void => {
    const collisions = (incoming.collections ?? [])
        .filter((c) => typeof c?.slug === 'string' && c.slug.startsWith(BRIDGE_COLLECTION_PREFIX))
        .map((c) => c.slug);
    if (collisions.length > 0) {
        throw new Error(
            `[bridge] reserved prefix collision: existing collection(s) using "${BRIDGE_COLLECTION_PREFIX}" prefix: ${collisions.join(', ')}`,
        );
    }
};

export const buildBridgePlugin = (manifests: readonly BridgeManifest[]): Plugin => {
    return async (incoming: Config): Promise<Config> => {
        assertUniqueSlugs(manifests);
        assertFieldsValid(manifests);
        assertNoPrefixCollision(incoming);

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
