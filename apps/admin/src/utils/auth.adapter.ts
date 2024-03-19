import { Identity, User } from '@nordcom/commerce-db';

import type { Adapter, AdapterAccount } from '@auth/core/adapters';
import type { UserBase } from '@nordcom/commerce-db';

export function AuthAdapter(): Adapter {
    return {
        async getUser(id) {
            try {
                return await User.find({ id });
            } catch {
                return null;
            }
        },

        async getUserByAccount({
            providerAccountId,
            provider
        }: Pick<AdapterAccount, 'provider' | 'providerAccountId'>) {
            try {
                return (await User.find({
                    count: 1,
                    filter: {
                        identities: {
                            $elemMatch: {
                                provider: provider,
                                identity: providerAccountId
                            }
                        }
                    }
                })) as UserBase;
            } catch {
                return null;
            }
        },

        async getUserByEmail(email) {
            try {
                return await User.findOne({ email });
            } catch {
                return null;
            }
        },

        async createUser({ email, name, image: avatar, emailVerified }) {
            return await User.create({
                email,
                name: name || email,
                avatar: avatar || undefined,
                emailVerified,
                identities: []
            });
        },
        async updateUser(user) {
            console.debug('[TODO] AuthAdapter - updateUser', user);
            return user as any;
        },
        async deleteUser(userId) {
            console.debug('[TODO] AuthAdapter - deleteUser', userId);
            return null;
        },

        async createSession(session) {
            console.debug('[TODO] AuthAdapter - createSession', session);
            return session;
        },
        async updateSession(session) {
            console.debug('[TODO] AuthAdapter - updateSession', session);
            return null;
        },
        async deleteSession(sessionToken) {
            console.debug('[TODO] AuthAdapter - deleteSession', sessionToken);
            return null;
        },

        async linkAccount({ userId, ...account }) {
            const user = await User.findById(userId);
            if (!user) return null;

            // Update or create the identity
            const identity = await Identity.findOneAndUpdate(
                {
                    provider: account.provider,
                    identity: account.providerAccountId
                },
                {
                    provider: account.provider,
                    identity: account.providerAccountId,
                    scope: account.scope,
                    //expiresAt: account.expiresAt,
                    refreshToken: account.refreshToken,
                    accessToken: account.accessToken
                },
                {
                    upsert: true,
                    new: true
                }
            );
            if (!identity) return null;

            if (!user.identities.find(({ id }) => id === identity.id)) {
                user.identities.push(identity);
                await user.save();
            }

            return {
                userId,
                ...account
            };
        },
        async unlinkAccount(providerAccountId) {
            console.debug('[TODO] AuthAdapter - unlinkAccount', providerAccountId);
            return;
        }
    };
}
