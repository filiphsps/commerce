import { describe, expect, it } from 'vitest';

import { remapObjectId } from '../transform/id-remap';
import { type SourceDataset, transform } from '../transform/index';
import { buildReferenceGraph, collectReferences, REFERENCE_EDGES, remapSession } from './references';

/** Stable source `ObjectId`s shared across the golden fixture so every surrogate derivation is checkable. */
const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9c0';
const USER_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e2';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f3';
const SESSION_ID = '6630f1a2b3c4d5e6f7a8ba04';

/**
 * Golden source: one shop (collaborator + feature-flag ref + masked credentials), the referenced
 * global flag, and a review — the same shape PIPELINE-01's transform consumes.
 */
const goldenInput: SourceDataset = {
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Nordcom Demo',
            domain: 'nordcom-demo-shop.com',
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 'shpat_SECRET', publicToken: 'pub' },
            },
            collaborators: [{ user: USER_ID, permissions: ['admin'] }],
            featureFlags: [{ flag: { $oid: FLAG_ID } }],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
        },
    ],
    featureFlags: [
        {
            _id: { $oid: FLAG_ID },
            key: 'checkout.express',
            defaultValue: false,
            targeting: [],
        },
    ],
    reviews: [
        {
            _id: { $oid: REVIEW_ID },
            shop: SHOP_ID,
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
        },
    ],
};

/** The owning user and a session pointing at it — the auth family the main shop transform does not stage. */
const goldenUsers = [{ _id: { $oid: USER_ID }, email: 'owner@example.com', name: 'Owner' }];
const goldenSessions = [
    {
        _id: { $oid: SESSION_ID },
        user: { $oid: USER_ID },
        token: 'sess_token',
        expiresAt: { $date: '2024-06-01T00:00:00.000Z' },
        createdAt: { $date: '2024-04-30T00:00:00.000Z' },
        updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
    },
];

describe('remapSession', () => {
    it('remaps sessions.user to the same surrogate users id the collaborator ref uses', () => {
        const row = remapSession(goldenSessions[0]!);
        expect(row?.payloadId).toBe(remapObjectId('sessions', SESSION_ID));
        expect(row?.document.user).toBe(remapObjectId('users', USER_ID));
    });

    it('returns null for a session with no id or no user (skip, never throw)', () => {
        expect(remapSession({ user: { $oid: USER_ID } })).toBeNull();
        expect(remapSession({ _id: { $oid: SESSION_ID } })).toBeNull();
    });

    it('does not mutate its input', () => {
        const before = JSON.stringify(goldenSessions[0]);
        remapSession(goldenSessions[0]!);
        expect(JSON.stringify(goldenSessions[0])).toBe(before);
    });
});

describe('REFERENCE_EDGES catalog', () => {
    it('covers every internal shopId/ObjectId reference the migration must keep consistent', () => {
        expect(REFERENCE_EDGES).toEqual([
            { table: 'shopCredentials', field: 'shop', target: 'shops' },
            { table: 'shopDomains', field: 'shop', target: 'shops' },
            { table: 'shopCollaborators', field: 'shop', target: 'shops' },
            { table: 'shopCollaborators', field: 'user', target: 'users' },
            { table: 'shopFeatureFlags', field: 'shop', target: 'shops' },
            { table: 'shopFeatureFlags', field: 'flag', target: 'featureFlags' },
            { table: 'reviews', field: 'shopId', target: 'shops' },
            { table: 'sessions', field: 'user', target: 'users' },
        ]);
    });
});

describe('collectReferences — only edges with an in-scope target are collected', () => {
    it('omits user edges when no users registry is present', () => {
        const dataset = transform(goldenInput);
        const graph = buildReferenceGraph(dataset);
        expect(graph.references.some((ref) => ref.toTable === 'users')).toBe(false);
        // shop + flag edges are present and resolvable.
        expect(graph.references.some((ref) => ref.fromTable === 'reviews' && ref.toTable === 'shops')).toBe(true);
        expect(
            graph.references.some((ref) => ref.fromTable === 'shopFeatureFlags' && ref.toTable === 'featureFlags'),
        ).toBe(true);
    });

    it('skips a reference field that is absent or not a string', () => {
        const refs = collectReferences({ reviews: [{ payloadId: 'r1', document: {} }] }, { shops: new Set() });
        expect(refs).toHaveLength(0);
    });
});

describe('buildReferenceGraph — acceptance #1: every reference resolves to a live row', () => {
    const dataset = transform(goldenInput);
    const graph = buildReferenceGraph(dataset, { users: goldenUsers, sessions: goldenSessions });

    it('registers shops, featureFlags, and users as resolvable targets', () => {
        expect(Object.keys(graph.liveIds).sort()).toEqual(['featureFlags', 'shops', 'users']);
        expect(graph.liveIds.shops?.has(dataset.shops[0]!.payloadId)).toBe(true);
        expect(graph.liveIds.users?.has(remapObjectId('users', USER_ID))).toBe(true);
    });

    it('every collected reference points at a live target id (zero dangling)', () => {
        for (const ref of graph.references) {
            expect(graph.liveIds[ref.toTable]?.has(ref.toId)).toBe(true);
        }
    });

    it('includes the session.user and collaborator.user edges resolving to one shared users row', () => {
        const sessionRef = graph.references.find((ref) => ref.fromTable === 'sessions');
        const collaboratorRef = graph.references.find(
            (ref) => ref.fromTable === 'shopCollaborators' && ref.field === 'user',
        );
        expect(sessionRef?.toId).toBe(remapObjectId('users', USER_ID));
        expect(collaboratorRef?.toId).toBe(remapObjectId('users', USER_ID));
    });
});
