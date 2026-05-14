import type { Adapter } from '@auth/core/adapters';

import { User } from '@nordcom/commerce-db';
import { NotFoundError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('utils', () => {
    describe('AuthAdapter', () => {
        let adapter!: Adapter;

        beforeEach(async () => {
            const { AuthAdapter } = await import('./auth.adapter');
            adapter = AuthAdapter();
        });

        describe('getUser', () => {
            it('should get user by id', async () => {
                const id = '123';
                const user = { id: '123', name: 'John Doe' };
                const findSpy = vi.spyOn(User, 'find').mockResolvedValue({
                    toObject: vi.fn().mockReturnValue(user),
                } as any);

                const result = await adapter.getUser?.(id);

                expect(findSpy).toHaveBeenCalledWith({ id });
                expect(result).toEqual(user);
            });

            it('returns null on NotFoundError (adapter contract for "no such user")', async () => {
                vi.spyOn(User, 'find').mockRejectedValue(new NotFoundError('User'));
                const result = await adapter.getUser?.('123');
                expect(result).toBeNull();
            });

            it('re-throws on infra failures so Auth.js shows the real error page', async () => {
                // Returning null on infra failures used to silently re-trigger
                // user creation against a flapping DB and produce duplicate-key
                // blowups one step downstream — surface the real error instead.
                vi.spyOn(User, 'find').mockRejectedValue(new Error('mongo timeout'));
                const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                await expect(adapter.getUser?.('123')).rejects.toThrow('mongo timeout');
                errSpy.mockRestore();
            });
        });

        describe('getUserByAccount', () => {
            it('should get user by account', async () => {
                const providerAccountId = '456';
                const provider = 'google';
                const user = { id: '123', name: 'John Doe' };
                const findSpy = vi.spyOn(User, 'find').mockResolvedValue({
                    toObject: vi.fn().mockReturnValue(user),
                } as any);

                const result = await adapter.getUserByAccount?.({ provider, providerAccountId });

                expect(findSpy).toHaveBeenCalledWith({
                    count: 1,
                    filter: {
                        identities: {
                            $elemMatch: {
                                provider,
                                identity: providerAccountId,
                            },
                        },
                    },
                });
                expect(result).toEqual(user);
            });

            it('returns null on NotFoundError', async () => {
                vi.spyOn(User, 'find').mockRejectedValue(new NotFoundError('User'));
                const result = await adapter.getUserByAccount?.({ provider: 'google', providerAccountId: '456' });
                expect(result).toBeNull();
            });

            it('re-throws on infra failures', async () => {
                vi.spyOn(User, 'find').mockRejectedValue(new Error('mongo down'));
                const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                await expect(
                    adapter.getUserByAccount?.({ provider: 'google', providerAccountId: '456' }),
                ).rejects.toThrow('mongo down');
                errSpy.mockRestore();
            });
        });
    });
});
