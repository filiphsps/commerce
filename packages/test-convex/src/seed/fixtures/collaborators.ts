import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/** A seeded collaborator: the platform user, its standalone identity, a session, and the shop tier. */
export type CollaboratorSeed = {
    /** `users` row sans system fields/timestamps. */
    user: Omit<Doc<'users'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;
    /** Standalone `identities` row sans system fields/timestamps (mirrors the user's embedded identity). */
    identity: Omit<Doc<'identities'>, '_id' | '_creationTime' | 'createdAt' | 'updatedAt'>;
    /** Session token + epoch-ms expiry. */
    session: { token: string; expiresAt: number };
    /** Permission set linked via `shopCollaborators`. */
    permissions: string[];
};

/** Far-future epoch-ms so seeded sessions never expire under test/dev. */
const SESSION_EXPIRY = 4_102_444_800_000; // 2100-01-01

/**
 * Three collaborators for the advanced shop, one per permission tier, each with a GitHub OAuth
 * identity (embedded on the user AND as a standalone row) and a live session — enough material for
 * the admin's auth/tenant-access and collaborator-management surfaces.
 */
export const collaboratorFixtures: CollaboratorSeed[] = [
    {
        user: {
            email: 'owner@nordcom-demo-shop.com',
            name: 'Olivia Owner',
            emailVerified: SESSION_EXPIRY,
            groups: ['staff'],
            identities: [
                { id: 'idsub-owner-github', provider: 'github', identity: 'gh-owner-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        identity: { provider: 'github', identity: 'gh-owner-1' },
        session: { token: 'seed-session-owner', expiresAt: SESSION_EXPIRY },
        permissions: ['admin'],
    },
    {
        user: {
            email: 'editor@nordcom-demo-shop.com',
            name: 'Eddie Editor',
            emailVerified: SESSION_EXPIRY,
            identities: [
                { id: 'idsub-editor-github', provider: 'github', identity: 'gh-editor-1', createdAt: 0, updatedAt: 0 },
            ],
        },
        identity: { provider: 'github', identity: 'gh-editor-1' },
        session: { token: 'seed-session-editor', expiresAt: SESSION_EXPIRY },
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
        identity: { provider: 'github', identity: 'gh-viewer-1' },
        session: { token: 'seed-session-viewer', expiresAt: SESSION_EXPIRY },
        permissions: ['viewer'],
    },
];
