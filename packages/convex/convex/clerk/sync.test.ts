import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import { desiredCollaboratorRows, reconcileCollaboratorRows } from './sync';

/**
 * Brands a plain string as a `shops` id for the pure projection tests. The reconcile/desired helpers
 * key purely on the string identity of `shop`/`user`, so a cast is sufficient and avoids standing up
 * a Convex backend for what are deterministic, ctx-free functions.
 *
 * @param value - The raw id string to brand.
 * @returns The value typed as an `Id<'shops'>`.
 */
function shopId(value: string): Id<'shops'> {
    return value as Id<'shops'>;
}

/**
 * Brands a plain string as a `users` id for the pure projection tests. See {@link shopId}.
 *
 * @param value - The raw id string to brand.
 * @returns The value typed as an `Id<'users'>`.
 */
function userId(value: string): Id<'users'> {
    return value as Id<'users'>;
}

describe('desiredCollaboratorRows', () => {
    it('emits one row per shop with the default admin permission', () => {
        const user = userId('user_1');
        const rows = desiredCollaboratorRows({ shopIds: [shopId('shop_a'), shopId('shop_b')], userId: user });

        expect(rows).toEqual([
            { shop: shopId('shop_a'), user, permissions: ['admin'] },
            { shop: shopId('shop_b'), user, permissions: ['admin'] },
        ]);
    });

    it('honors an explicit permissions override on every emitted row', () => {
        const user = userId('user_1');
        const rows = desiredCollaboratorRows({
            shopIds: [shopId('shop_a')],
            userId: user,
            permissions: ['admin', 'billing'],
        });

        expect(rows).toEqual([{ shop: shopId('shop_a'), user, permissions: ['admin', 'billing'] }]);
    });

    it('emits no rows when the org owns no shops', () => {
        const rows = desiredCollaboratorRows({ shopIds: [], userId: userId('user_1') });

        expect(rows).toEqual([]);
    });
});

describe('reconcileCollaboratorRows', () => {
    it('plans creates for desired shops absent from the current set', () => {
        const user = userId('user_1');
        const current = [{ shop: shopId('shop_a'), user, permissions: ['admin'] }];
        const desired = desiredCollaboratorRows({ shopIds: [shopId('shop_a'), shopId('shop_b')], userId: user });

        const { toCreate, toDelete } = reconcileCollaboratorRows({ userId: user, current, desired });

        expect(toCreate).toEqual([{ shop: shopId('shop_b'), user, permissions: ['admin'] }]);
        expect(toDelete).toEqual([]);
    });

    it('plans deletes for current shops absent from the desired set', () => {
        const user = userId('user_1');
        const current = [
            { shop: shopId('shop_a'), user, permissions: ['admin'] },
            { shop: shopId('shop_b'), user, permissions: ['admin'] },
        ];
        const desired = desiredCollaboratorRows({ shopIds: [shopId('shop_a')], userId: user });

        const { toCreate, toDelete } = reconcileCollaboratorRows({ userId: user, current, desired });

        expect(toCreate).toEqual([]);
        expect(toDelete).toEqual([{ shop: shopId('shop_b'), user, permissions: ['admin'] }]);
    });

    it('plans nothing when current and desired already agree', () => {
        const user = userId('user_1');
        const current = [
            { shop: shopId('shop_a'), user, permissions: ['admin'] },
            { shop: shopId('shop_b'), user, permissions: ['admin'] },
        ];
        const desired = desiredCollaboratorRows({ shopIds: [shopId('shop_a'), shopId('shop_b')], userId: user });

        const { toCreate, toDelete } = reconcileCollaboratorRows({ userId: user, current, desired });

        expect(toCreate).toEqual([]);
        expect(toDelete).toEqual([]);
    });

    it("ignores another user's current row on the same shop, still planning the create for userId", () => {
        const user = userId('user_1');
        const other = userId('user_2');
        // `other` already collaborates on shop_a; `user` does not. A shop-only key would see shop_a as
        // "present" and wrongly suppress user's create — single-user filtering must prevent that.
        const current = [{ shop: shopId('shop_a'), user: other, permissions: ['admin'] }];
        const desired = desiredCollaboratorRows({ shopIds: [shopId('shop_a')], userId: user });

        const { toCreate, toDelete } = reconcileCollaboratorRows({ userId: user, current, desired });

        expect(toCreate).toEqual([{ shop: shopId('shop_a'), user, permissions: ['admin'] }]);
        // The foreign-user row is never scheduled for deletion by this user's reconcile.
        expect(toDelete).toEqual([]);
    });
});
