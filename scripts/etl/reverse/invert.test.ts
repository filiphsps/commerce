import { describe, expect, it } from 'vitest';

import type { Doc } from '../transform/id-remap';
import { type SourceDataset, transform } from '../transform/index';
import { type ConvexSnapshotDataset, invertSnapshot, mintObjectIdHex, snapshotFromStaged } from './invert';

/** Stable source ObjectId hex strings so every derivation is reproducible. */
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_A = '6630f1a2b3c4d5e6f7a8b9e1';
const FLAG_B = '6630f1a2b3c4d5e6f7a8b9e2';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f1';

/** A single-tenant source corpus exercising the full shop-family fan-out. */
const source: SourceDataset = {
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Fixture Shop',
            domain: 'fixture.example.com',
            alternativeDomains: ['alt.example.com'],
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'F' } },
                accents: [],
            },
            commerceProvider: {
                type: 'shopify',
                authentication: {
                    token: 'shpat_secret',
                    publicToken: 'public',
                    domain: 'fixture.myshopify.com',
                    customers: { id: 'cust-1', clientId: 'client-1', clientSecret: 'sealed' },
                },
                storefrontId: 'gid://shopify/Shop/1',
                domain: 'fixture.myshopify.com',
                id: 'shop-1',
            },
            featureFlags: [{ flag: { $oid: FLAG_B } }, { flag: { $oid: FLAG_A } }],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
        },
    ],
    featureFlags: [
        {
            _id: { $oid: FLAG_A },
            key: 'flag-a',
            defaultValue: true,
            targeting: [],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
        },
        {
            _id: { $oid: FLAG_B },
            key: 'flag-b',
            defaultValue: false,
            targeting: [],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
        },
    ],
    reviews: [
        {
            _id: { $oid: REVIEW_ID },
            shop: { $oid: SHOP_ID },
            createdAt: { $date: '2024-05-02T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-02T00:00:00.000Z' },
        },
    ],
};

/** Builds the staged snapshot of the fixture corpus through the REAL forward transform. */
const buildSnapshot = (): ConvexSnapshotDataset => snapshotFromStaged(transform(source));

describe('snapshotFromStaged', () => {
    it('promotes each staged payloadId to the row _id', () => {
        const staged = transform(source);
        const snapshot = snapshotFromStaged(staged);
        expect(snapshot.shops?.[0]?._id).toBe(staged.shops[0]?.payloadId);
        expect(snapshot.shops?.[0]?.legacyId).toBe(SHOP_ID);
    });
});

describe('invertSnapshot — shop family re-embedding', () => {
    it('restores the shop _id from legacyId and re-embeds both shredded secrets', () => {
        const { collections, divergences } = invertSnapshot(buildSnapshot());
        expect(divergences).toEqual([]);
        const shop = collections.shops[0];
        expect(shop?._id).toEqual({ $oid: SHOP_ID });
        const provider = shop?.commerceProvider as Doc;
        const authentication = provider.authentication as Doc;
        expect(authentication.token).toBe('shpat_secret');
        expect(authentication.publicToken).toBe('public');
        const customers = authentication.customers as Doc;
        expect(customers).toMatchObject({ id: 'cust-1', clientId: 'client-1', clientSecret: 'sealed' });
        expect(shop?.createdAt).toEqual({ $date: '2024-04-30T00:00:00.000Z' });
    });

    it('folds shopFeatureFlags joins back into an embedded ref array ordered by flag ObjectId', () => {
        const { collections } = invertSnapshot(buildSnapshot());
        expect(collections.shops[0]?.featureFlags).toEqual([{ flag: { $oid: FLAG_A } }, { flag: { $oid: FLAG_B } }]);
    });

    it('reports a domain-set mismatch when a shopDomains row is missing', () => {
        const snapshot = buildSnapshot();
        const tampered = { ...snapshot, shopDomains: (snapshot.shopDomains ?? []).slice(0, 1) };
        const { divergences } = invertSnapshot(tampered);
        expect(divergences).toEqual([
            { table: 'shopDomains', id: snapshot.shops?.[0]?._id, reason: 'domain-set-mismatch' },
        ]);
    });

    it('reports secrets attached to a non-Shopify provider instead of guessing a placement', () => {
        const snapshot = buildSnapshot();
        const shops = (snapshot.shops ?? []).map((row) => ({ ...row, commerceProvider: { type: 'dummy' } }));
        const { divergences, collections } = invertSnapshot({ ...snapshot, shops });
        expect(divergences.map((entry) => entry.reason)).toContain('credentials-without-shopify-provider');
        expect((collections.shops[0]?.commerceProvider as Doc).type).toBe('dummy');
    });

    it('reports a non-numeric stored timestamp instead of emitting a bogus date', () => {
        const snapshot = buildSnapshot();
        const shops = (snapshot.shops ?? []).map((row) => ({ ...row, createdAt: 'yesterday' }));
        const { divergences, collections } = invertSnapshot({ ...snapshot, shops });
        expect(divergences.map((entry) => entry.reason)).toContain('invalid-timestamp');
        expect(collections.shops[0]?.createdAt).toBeUndefined();
    });
});

describe('invertSnapshot — reviews', () => {
    it('restores the shop ref via legacyId and mints a deterministic replacement _id', () => {
        const first = invertSnapshot(buildSnapshot());
        const second = invertSnapshot(buildSnapshot());
        const review = first.collections.reviews[0];
        expect(review?.shop).toEqual({ $oid: SHOP_ID });
        expect(review?._id).toEqual({ $oid: expect.stringMatching(/^[0-9a-f]{24}$/) });
        // The minted id is NOT the lost original — but it is stable across runs.
        expect(review?._id).not.toEqual({ $oid: REVIEW_ID });
        expect(second.collections).toEqual(first.collections);
    });

    it('routes a review with a dangling shop reference to the divergence report', () => {
        const snapshot = buildSnapshot();
        const reviews = (snapshot.reviews ?? []).map((row) => ({ ...row, shopId: 'dangling' }));
        const { divergences, collections } = invertSnapshot({ ...snapshot, reviews });
        expect(collections.reviews).toEqual([]);
        expect(divergences.map((entry) => entry.reason)).toContain('unresolved-shop-reference');
    });
});

describe('invertSnapshot — collaborators', () => {
    /** A snapshot with one live-shaped user row plus a collaborator join pointing at it. */
    const withCollaborator = (): ConvexSnapshotDataset => {
        const snapshot = buildSnapshot();
        return {
            ...snapshot,
            users: [
                {
                    _id: 'user_live_1',
                    email: 'op@example.com',
                    name: 'Operator',
                    emailVerified: null,
                    identities: [],
                    createdAt: 1714435200000,
                    updatedAt: 1714435200000,
                },
            ],
            shopCollaborators: [
                {
                    _id: 'collab_live_1',
                    shop: snapshot.shops?.[0]?._id,
                    user: 'user_live_1',
                    permissions: ['admin'],
                },
            ],
        };
    };

    it('re-embeds collaborators with the user ref remapped to the minted user _id', () => {
        const { collections, divergences } = invertSnapshot(withCollaborator());
        expect(divergences).toEqual([]);
        expect(collections.shops[0]?.collaborators).toEqual([
            { user: { $oid: mintObjectIdHex('users', 'user_live_1') }, permissions: ['admin'] },
        ]);
        expect(collections.users[0]?._id).toEqual({ $oid: mintObjectIdHex('users', 'user_live_1') });
    });

    it('reports a collaborator whose user is absent from the snapshot', () => {
        const snapshot = withCollaborator();
        const { divergences, collections } = invertSnapshot({ ...snapshot, users: [] });
        expect(divergences.map((entry) => entry.reason)).toContain('unresolved-user-reference');
        expect(collections.shops[0]?.collaborators).toBeUndefined();
    });
});

describe('invertSnapshot — auth family mirror', () => {
    /** Live-shaped auth rows: the faithful Convex mirror of the Mongo Base document shapes. */
    const authSnapshot = (): ConvexSnapshotDataset => ({
        users: [
            {
                _id: 'user_live_1',
                _creationTime: 1717200000000,
                email: 'a@example.com',
                name: 'Alice',
                avatar: 'https://cdn/a.png',
                emailVerified: 1714521600000,
                groups: ['admin'],
                identities: [
                    {
                        id: '6630f1a2b3c4d5e6f7a8b901',
                        provider: 'github',
                        identity: 'alice',
                        scope: 'read:user',
                        accessToken: 'gho_x',
                        createdAt: 1714435200000,
                        updatedAt: 1714435200000,
                    },
                    {
                        id: 'native-link-1',
                        provider: 'google',
                        identity: 'alice@example.com',
                        createdAt: 1714435200000,
                        updatedAt: 1714435200000,
                    },
                ],
                createdAt: 1714435200000,
                updatedAt: 1714521600000,
            },
            {
                _id: 'user_live_2',
                email: 'b@example.com',
                name: 'Bob',
                emailVerified: null,
                identities: [],
                createdAt: 1714435200000,
                updatedAt: 1714435200000,
            },
        ],
        sessions: [
            {
                _id: 'session_live_1',
                user: 'user_live_1',
                token: 'tok-1',
                expiresAt: 1717200000000,
                createdAt: 1714435200000,
                updatedAt: 1714435200000,
            },
        ],
        identities: [
            {
                _id: 'identity_live_1',
                provider: 'github',
                identity: 'alice',
                scope: 'read:user',
                accessToken: 'gho_x',
                expiresAt: 1717200000000,
                createdAt: 1714435200000,
                updatedAt: 1714435200000,
            },
        ],
    });

    it('restores users with dates rehydrated and the migrated embedded-identity _id preserved', () => {
        const { collections, divergences } = invertSnapshot(authSnapshot());
        expect(divergences).toEqual([]);
        const alice = collections.users.find((user) => user.email === 'a@example.com');
        expect(alice?.emailVerified).toEqual({ $date: '2024-05-01T00:00:00.000Z' });
        expect(alice?.groups).toEqual(['admin']);
        const embedded = alice?.identities as Doc[];
        expect(embedded[0]?._id).toEqual({ $oid: '6630f1a2b3c4d5e6f7a8b901' });
        expect(embedded[0]?.accessToken).toBe('gho_x');
        // A post-flip native link has no Mongo subdocument id — a deterministic one is minted.
        expect(embedded[1]?._id).toEqual({ $oid: mintObjectIdHex('users.identities', 'native-link-1') });
        const bob = collections.users.find((user) => user.email === 'b@example.com');
        expect(bob?.emailVerified).toBeNull();
        // The exported `_creationTime` is volatile deployment state and never reaches a restore doc.
        expect(alice && '_creationTime' in alice).toBe(false);
    });

    it('keeps sessions referentially consistent with the minted user ids', () => {
        const { collections } = invertSnapshot(authSnapshot());
        const session = collections.sessions[0];
        expect(session?.user).toEqual({ $oid: mintObjectIdHex('users', 'user_live_1') });
        expect(session?.expiresAt).toEqual({ $date: '2024-06-01T00:00:00.000Z' });
        expect(session?.token).toBe('tok-1');
    });

    it('restores standalone identities with token attributes intact', () => {
        const { collections } = invertSnapshot(authSnapshot());
        expect(collections.identities[0]).toMatchObject({
            provider: 'github',
            identity: 'alice',
            scope: 'read:user',
            accessToken: 'gho_x',
            expiresAt: { $date: '2024-06-01T00:00:00.000Z' },
        });
    });

    it('routes a session with a dangling user reference to the divergence report', () => {
        const snapshot = authSnapshot();
        const { divergences, collections } = invertSnapshot({ ...snapshot, users: [] });
        expect(collections.sessions).toEqual([]);
        expect(divergences).toEqual([{ table: 'sessions', id: 'session_live_1', reason: 'unresolved-user-reference' }]);
    });
});
