import { describe, expect, it } from 'vitest';

import { remapObjectId } from '../transform/id-remap';
import { type SourceDataset, transform } from '../transform/index';
import { buildReferenceGraph } from './references';
import { findDanglingReferences, verifyReferentialIntegrity } from './verify-integrity';

const SHOP_ID = '6630f1a2b3c4d5e6f7a8b9c0';
const USER_ID = '6630f1a2b3c4d5e6f7a8b9d1';
const FLAG_ID = '6630f1a2b3c4d5e6f7a8b9e2';
const REVIEW_ID = '6630f1a2b3c4d5e6f7a8b9f3';
const SESSION_ID = '6630f1a2b3c4d5e6f7a8ba04';

/** Golden source: a shop with a collaborator + feature-flag ref, the global flag, and a review. */
const goldenInput: SourceDataset = {
    shops: [
        {
            _id: { $oid: SHOP_ID },
            name: 'Nordcom Demo',
            domain: 'nordcom-demo-shop.com',
            commerceProvider: { type: 'shopify', authentication: { publicToken: 'pub' } },
            collaborators: [{ user: USER_ID, permissions: ['admin'] }],
            featureFlags: [{ flag: { $oid: FLAG_ID } }],
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-05-01T00:00:00.000Z' },
        },
    ],
    featureFlags: [{ _id: { $oid: FLAG_ID }, key: 'checkout.express', defaultValue: false, targeting: [] }],
    reviews: [
        {
            _id: { $oid: REVIEW_ID },
            shop: SHOP_ID,
            createdAt: { $date: '2024-04-30T00:00:00.000Z' },
            updatedAt: { $date: '2024-04-30T00:00:00.000Z' },
        },
    ],
};

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

describe('verifyReferentialIntegrity — acceptance #3: zero dangling references', () => {
    it('reports ok with zero dangling for a fully-resolvable graph (incl. sessions + users)', () => {
        const dataset = transform(goldenInput);
        const graph = buildReferenceGraph(dataset, { users: goldenUsers, sessions: goldenSessions });
        const report = verifyReferentialIntegrity(graph);
        expect(report.ok).toBe(true);
        expect(report.dangling).toEqual([]);
        // The graph really did contain the user/flag/shop edges it just proved resolvable.
        expect(graph.references.length).toBeGreaterThan(0);
    });

    it('reports ok for the shop/flag subset when the auth family is not loaded', () => {
        const dataset = transform(goldenInput);
        const report = verifyReferentialIntegrity(buildReferenceGraph(dataset));
        expect(report.ok).toBe(true);
    });
});

describe('findDanglingReferences — fails on a genuinely missing target row', () => {
    it('flags the collaborator + session user edges when the users row is absent', () => {
        const dataset = transform(goldenInput);
        // Sessions loaded, users NOT loaded -> the user target exists in the registry but holds no ids,
        // so every user-targeted reference dangles.
        const graph = buildReferenceGraph(dataset, { users: [], sessions: goldenSessions });
        const dangling = findDanglingReferences(graph);
        const danglingUserIds = dangling.filter((ref) => ref.toTable === 'users').map((ref) => ref.toId);
        expect(danglingUserIds).toContain(remapObjectId('users', USER_ID));
        expect(verifyReferentialIntegrity(graph).ok).toBe(false);
    });

    it('flags a review whose shop ref points at no live shop row', () => {
        const dataset = transform(goldenInput);
        const graph = buildReferenceGraph(dataset);
        graph.references.push({
            fromTable: 'reviews',
            fromId: 'orphan-review',
            field: 'shopId',
            toTable: 'shops',
            toId: 'no-such-shop',
        });
        const report = verifyReferentialIntegrity(graph);
        expect(report.ok).toBe(false);
        expect(report.dangling).toContainEqual({
            fromTable: 'reviews',
            fromId: 'orphan-review',
            field: 'shopId',
            toTable: 'shops',
            toId: 'no-such-shop',
        });
    });
});
