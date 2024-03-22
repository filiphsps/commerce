import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '@nordcom/commerce-db';

import { AuthAdapter } from './auth.adapter';

import type { Adapter } from '@auth/core/adapters';

describe('AuthAdapter', () => {
    let adapter!: Adapter;

    beforeEach(() => {
        adapter = AuthAdapter();
    });

    describe('getUser', () => {
        it('should get user by id', async () => {
            const id = '123';
            const user = { id: '123', name: 'John Doe' };
            const findSpy = vi.spyOn(User, 'find').mockResolvedValue(user as any);

            const result = await adapter.getUser?.(id);

            expect(findSpy).toHaveBeenCalledWith({ id });
            expect(result).toEqual(user);
        });

        it('should handle error when getting user', async () => {
            const id = '123';
            const error = new Error('Error getting user');
            vi.spyOn(User, 'find').mockRejectedValue(error);

            const result = await adapter.getUser?.(id);
            expect(result).toBeNull();
        });
    });

    describe('getUserByAccount', () => {
        it('should get user by account', async () => {
            const providerAccountId = '456';
            const provider = 'google';
            const user = { id: '123', name: 'John Doe' };
            const findSpy = vi.spyOn(User, 'find').mockResolvedValue(user as any);

            const result = await adapter.getUserByAccount?.({ provider, providerAccountId });

            expect(findSpy).toHaveBeenCalledWith({
                count: 1,
                filter: {
                    identities: {
                        $elemMatch: {
                            provider,
                            identity: providerAccountId
                        }
                    }
                }
            });
            expect(result).toEqual(user);
        });

        it('should handle error when getting user by account', async () => {
            const providerAccountId = '456';
            const provider = 'google';
            const error = new Error('Error getting user by account');
            vi.spyOn(User, 'find').mockRejectedValue(error);

            const result = await adapter.getUserByAccount?.({ provider, providerAccountId });

            expect(result).toBeNull();
        });
    });

    // Add tests for other methods...
});
