import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/** A seeded collaborator: the platform user (with its embedded OAuth identity) and its shop tier. */
export type CollaboratorSeed = {
    /** `users` row sans system fields/timestamps. */
    user: Omit<Doc<'users'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;
    /** Permission set linked via `shopCollaborators`. */
    permissions: string[];
};

/** Far-future epoch-ms so seeded `emailVerified` stamps stay valid under test/dev. */
const FAR_FUTURE = 4_102_444_800_000; // 2100-01-01

/**
 * Three collaborators for the advanced shop, one per permission tier, each with a GitHub OAuth
 * identity embedded on the user — enough material for the admin's auth/tenant-access and
 * collaborator-management surfaces.
 */
export const collaboratorFixtures: CollaboratorSeed[] = [
    {
        user: {
            email: 'owner@nordcom-demo-shop.com',
            name: 'Olivia Owner',
            emailVerified: FAR_FUTURE,
            groups: ['staff'],
            identities: [
                { id: 'idsub-owner-github', provider: 'github', identity: 'gh-owner-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        permissions: ['admin'],
    },
    {
        user: {
            email: 'editor@nordcom-demo-shop.com',
            name: 'Eddie Editor',
            emailVerified: FAR_FUTURE,
            identities: [
                { id: 'idsub-editor-github', provider: 'github', identity: 'gh-editor-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        permissions: ['editor'],
    },
    {
        user: {
            email: 'viewer@nordcom-demo-shop.com',
            name: 'Vera Viewer',
            emailVerified: null,
            identities: [
                { id: 'idsub-viewer-github', provider: 'github', identity: 'gh-viewer-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        permissions: ['viewer'],
    },
];
