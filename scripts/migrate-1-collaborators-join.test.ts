import { describe, expect, it } from 'vitest';
import {
    applyShopCollaborators,
    convertShopCollaborators,
    type Doc,
    isCanonicalCollaborator,
    normalizeCollaborator,
    planShopCollaborators,
    toIdString,
} from './migrate-1-collaborators-join';

/** A stand-in for a BSON `ObjectId`: the migration core reads ids via `toHexString`. */
const objectId = (hex: string): { toHexString: () => string } => ({ toHexString: () => hex });

describe('isCanonicalCollaborator', () => {
    it('is true for a clean { user: string, permissions: string[] } row', () => {
        expect(isCanonicalCollaborator({ user: 'user-1', permissions: ['admin'] })).toBe(true);
    });

    it('is true even when the array subdoc carries a Mongoose _id', () => {
        expect(isCanonicalCollaborator({ _id: objectId('sub-1'), user: 'user-1', permissions: [] })).toBe(true);
    });

    it('is false when user is an ObjectId ref', () => {
        expect(isCanonicalCollaborator({ user: objectId('user-1'), permissions: ['admin'] })).toBe(false);
    });

    it('is false when permissions is missing or not a string array', () => {
        expect(isCanonicalCollaborator({ user: 'user-1' })).toBe(false);
        expect(isCanonicalCollaborator({ user: 'user-1', permissions: [1, 2] })).toBe(false);
    });
});

describe('normalizeCollaborator', () => {
    it('resolves an ObjectId user ref to a string id', () => {
        expect(normalizeCollaborator({ user: objectId('user-1'), permissions: ['admin'] })).toEqual({
            user: 'user-1',
            permissions: ['admin'],
        });
    });

    it('resolves an embedded user document down to its _id', () => {
        expect(
            normalizeCollaborator({ user: { _id: objectId('user-2'), email: 'a@b.c' }, permissions: ['read'] }),
        ).toEqual({ user: 'user-2', permissions: ['read'] });
    });

    it('defaults permissions to an empty array and coerces non-string entries', () => {
        expect(normalizeCollaborator({ user: 'user-3' })).toEqual({ user: 'user-3', permissions: [] });
        expect(normalizeCollaborator({ user: 'user-3', permissions: [1] })).toEqual({
            user: 'user-3',
            permissions: ['1'],
        });
    });

    it('returns null when no user id can be derived', () => {
        expect(normalizeCollaborator({ permissions: ['admin'] })).toBeNull();
        expect(normalizeCollaborator(null)).toBeNull();
    });
});

describe('convertShopCollaborators', () => {
    it('converts ObjectId-user rows and reports the change', () => {
        const result = convertShopCollaborators({
            collaborators: [{ user: objectId('user-1'), permissions: ['admin'] }],
        });
        expect(result.changed).toBe(true);
        expect(result.dropped).toBe(0);
        expect(result.collaborators).toEqual([{ user: 'user-1', permissions: ['admin'] }]);
    });

    it('leaves an already-canonical array unchanged', () => {
        const result = convertShopCollaborators({
            collaborators: [{ user: 'user-1', permissions: ['admin'] }],
        });
        expect(result.changed).toBe(false);
        expect(result.collaborators).toEqual([{ user: 'user-1', permissions: ['admin'] }]);
    });

    it('drops corrupt rows with no resolvable user', () => {
        const result = convertShopCollaborators({
            collaborators: [{ permissions: ['admin'] }, { user: objectId('user-2'), permissions: [] }],
        });
        expect(result.changed).toBe(true);
        expect(result.dropped).toBe(1);
        expect(result.collaborators).toEqual([{ user: 'user-2', permissions: [] }]);
    });

    it('treats a missing or non-array collaborators field as no change', () => {
        expect(convertShopCollaborators({})).toEqual({ collaborators: [], changed: false, dropped: 0 });
        expect(convertShopCollaborators({ collaborators: null })).toEqual({
            collaborators: [],
            changed: false,
            dropped: 0,
        });
    });
});

describe('planShopCollaborators (the --dry-run count core)', () => {
    const shops: Doc[] = [
        { _id: objectId('shop-a'), collaborators: [{ user: objectId('user-1'), permissions: ['admin'] }] },
        {
            _id: objectId('shop-b'),
            collaborators: [
                { user: objectId('user-2'), permissions: ['read'] },
                { permissions: ['write'] }, // dropped: no user
            ],
        },
        { _id: objectId('shop-c'), collaborators: [{ user: 'user-3', permissions: [] }] }, // already canonical
        { _id: objectId('shop-d'), collaborators: [] },
    ];

    it('reports exact counts without mutating input', () => {
        const before = JSON.stringify(shops, (_k, v) => (typeof v === 'function' ? v() : v));
        const report = planShopCollaborators(shops);
        expect(report.scanned).toBe(4);
        expect(report.shopsChanged).toBe(2);
        expect(report.rowsConverted).toBe(2);
        expect(report.rowsDropped).toBe(1);
        expect(report.writes).toHaveLength(2);
        expect(JSON.stringify(shops, (_k, v) => (typeof v === 'function' ? v() : v))).toBe(before);
    });
});

describe('idempotency', () => {
    it('a converted shop re-plans with zero embedded rows and no further change', () => {
        const shop: Doc = {
            _id: objectId('shop-a'),
            collaborators: [{ user: objectId('user-1'), permissions: ['admin'] }],
        };
        const conversion = convertShopCollaborators(shop);
        expect(conversion.changed).toBe(true);
        const migrated = applyShopCollaborators(shop, conversion.collaborators);
        for (const row of migrated.collaborators as unknown[]) expect(isCanonicalCollaborator(row)).toBe(true);
        expect(convertShopCollaborators(migrated).changed).toBe(false);
        expect(planShopCollaborators([migrated]).shopsChanged).toBe(0);
    });
});

describe('toIdString', () => {
    it('reads an ObjectId via toHexString', () => {
        expect(toIdString(objectId('abc'))).toBe('abc');
    });
});
