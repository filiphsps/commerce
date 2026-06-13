import type { Adapter } from '@auth/core/adapters';

import { User } from '@nordcom/commerce-db';
import { NotFoundError, TodoError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('utils', () => {
    describe('AuthAdapter', () => {
        let adapter!: Adapter;

        beforeEach(async () => {
            const { AuthAdapter } = await import('./auth.adapter');
            adapter = AuthAdapter();
        });

        describe('getUser', () => {
            it('projects the Convex-shaped user row onto the Auth.js AdapterUser', async () => {
                const id = '123';
                // The seam returns a plain row (no Mongoose document methods); the
                // adapter maps it directly, mapping `avatar` -> `image`.
                const row = { id, email: 'john@example.com', name: 'John Doe', avatar: undefined, emailVerified: null };
                const findSpy = vi.spyOn(User, 'find').mockResolvedValue(row as any);

                const result = await adapter.getUser?.(id);

                expect(findSpy).toHaveBeenCalledWith({ id });
                expect(result).toEqual({
                    id,
                    email: 'john@example.com',
                    name: 'John Doe',
                    image: null,
                    emailVerified: null,
                });
            });

            it('returns null on NotFoundError (adapter contract for "no such user")', async () => {
                vi.spyOn(User, 'find').mockRejectedValue(new NotFoundError('User'));
                const result = await adapter.getUser?.('123');
                expect(result).toBeNull();
            });

            it('re-throws on infra failures so Auth.js shows the real error page', async () => {
                // Returning null on infra failures used to silently re-trigger
                // user creation against a flapping backend and produce
                // duplicate-key blowups one step downstream — surface the real
                // error instead.
                vi.spyOn(User, 'find').mockRejectedValue(new TypeError('backend timeout'));
                const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                await expect(adapter.getUser?.('123')).rejects.toThrow('backend timeout');
                errSpy.mockRestore();
            });
        });

        describe('getUserByAccount', () => {
            it('resolves the user by its embedded provider identity', async () => {
                const providerAccountId = '456';
                const provider = 'google';
                const row = {
                    id: '123',
                    email: 'john@example.com',
                    name: 'John Doe',
                    avatar: undefined,
                    emailVerified: null,
                };
                const findSpy = vi.spyOn(User, 'find').mockResolvedValue(row as any);

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
                expect(result).toEqual({
                    id: '123',
                    email: 'john@example.com',
                    name: 'John Doe',
                    image: null,
                    emailVerified: null,
                });
            });

            it('returns null on NotFoundError', async () => {
                vi.spyOn(User, 'find').mockRejectedValue(new NotFoundError('User'));
                const result = await adapter.getUserByAccount?.({ provider: 'google', providerAccountId: '456' });
                expect(result).toBeNull();
            });

            it('re-throws on infra failures', async () => {
                vi.spyOn(User, 'find').mockRejectedValue(new TypeError('backend down'));
                const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                await expect(
                    adapter.getUserByAccount?.({ provider: 'google', providerAccountId: '456' }),
                ).rejects.toThrow('backend down');
                errSpy.mockRestore();
            });
        });

        // The Convex-backed seam implements none of these under the JWT session strategy.
        // They must fail loud (TodoError) rather than no-op, so a future caller never loses a
        // write to a silent stub. Spy on User.create to prove no persistence is attempted.
        describe('unsupported write/delete methods fail loud', () => {
            it('updateUser throws TodoError without touching the seam', async () => {
                const createSpy = vi.spyOn(User, 'create');
                await expect(
                    adapter.updateUser?.({ id: '123', email: 'a@b.c', emailVerified: null } as any),
                ).rejects.toBeInstanceOf(TodoError);
                expect(createSpy).not.toHaveBeenCalled();
            });

            it('deleteUser throws TodoError', async () => {
                await expect(adapter.deleteUser?.('123')).rejects.toBeInstanceOf(TodoError);
            });

            it('updateSession throws TodoError', async () => {
                await expect(
                    adapter.updateSession?.({ sessionToken: 'tok', userId: '123', expires: new Date(0) }),
                ).rejects.toBeInstanceOf(TodoError);
            });

            it('deleteSession throws TodoError', async () => {
                await expect(adapter.deleteSession?.('tok')).rejects.toBeInstanceOf(TodoError);
            });

            it('unlinkAccount throws TodoError', async () => {
                await expect(
                    adapter.unlinkAccount?.({ provider: 'google', providerAccountId: '456' }),
                ).rejects.toBeInstanceOf(TodoError);
            });
        });
    });
});
