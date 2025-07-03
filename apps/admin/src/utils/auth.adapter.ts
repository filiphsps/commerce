import { Identity, Session, User } from '@nordcom/commerce-db';

import type { Adapter, AdapterAccount } from '@auth/core/adapters';

export function AuthAdapter(): Adapter {
    return {
        async getUser(id) {
            try {
                return (await User.find({ id })).toObject();
            } catch (error: unknown) {
                console.error(error);
                return null;
            }
        },

        async getUserByAccount({
            providerAccountId,
            provider
        }: Pick<AdapterAccount, 'provider' | 'providerAccountId'>) {
            try {
                return (
                    await User.find({
                        count: 1,
                        filter: {
                            identities: {
                                $elemMatch: {
                                    provider: provider,
                                    identity: providerAccountId
                                }
                            }
                        }
                    })
                ).toObject();
            } catch (error: unknown) {
                console.error(error);
                return null;
            }
        },

        async getUserByEmail(email) {
            try {
                return (
                    await User.find({
                        count: 1,
                        filter: { email }
                    })
                ).toObject();
            } catch (error: unknown) {
                console.error(error);
                return null;
            }
        },

        async createUser({ email, name, image: avatar, emailVerified }) {
            return (
                await User.create({
                    email,
                    name: name || email,
                    avatar: avatar || undefined,
                    emailVerified,
                    identities: []
                })
            ).toObject();
        },
        async updateUser(user) {
            console.debug('[TODO] AuthAdapter - updateUser', user);
            return user as any;
        },
        async deleteUser(userId) {
            console.debug('[TODO] AuthAdapter - deleteUser', userId);
            return null;
        },

        async createSession({ userId, sessionToken, expires }) {
            const session = await Session.create({
                user: await User.find({
                    id: userId
                }),
                token: sessionToken,
                expiresAt: expires
            });

            return {
                sessionToken: session.token,
                userId: session.user.id,
                expires: session.expiresAt
            };
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
            try {
                const user = await User.findById(userId);
                if (!user) {
                    return null;
                }

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
                        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
                        refreshToken: account.refreshToken,
                        accessToken: account.accessToken
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );
                if (!identity) {
                    return null;
                }

                if (!user.identities.find(({ id }: any) => id === identity.id)) {
                    user.identities.push(identity);
                    await user.save();
                }

                return {
                    userId,
                    ...account
                };
            } catch (error: unknown) {
                console.error(error);
                return null;
            }
        },
        async unlinkAccount(providerAccountId) {
            console.debug('[TODO] AuthAdapter - unlinkAccount', providerAccountId);
            return;
        }
    };
}
