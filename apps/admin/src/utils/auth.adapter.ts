import type { Adapter, AdapterAccount, AdapterUser } from '@auth/core/adapters';
import { Identity, Session, User } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';

// `null` is the adapter contract for "no such user/account" — Auth.js then
// triggers user creation. The previous implementation also returned `null` on
// real DB errors (mongo timeout, replica-set election, pool saturation), which
// silently triggered user creation against a flapping DB and produced
// duplicate-key blowups one step downstream. Distinguish "not found" (return
// null) from "infra failed" (re-throw) so Auth.js shows the real error page
// instead of mutating state under a partial failure.
const adapterCatch = (op: string, error: unknown): null => {
    if (CommerceError.isNotFound(error)) return null;
    console.error(`[auth-adapter] ${op} failed:`, error);
    throw error;
};

export function AuthAdapter(): Adapter {
    return {
        async getUser(id) {
            try {
                return (await User.find({ id })).toObject();
            } catch (error: unknown) {
                return adapterCatch('getUser', error);
            }
        },

        async getUserByAccount({
            providerAccountId,
            provider,
        }: Pick<AdapterAccount, 'provider' | 'providerAccountId'>) {
            try {
                return (
                    await User.find({
                        count: 1,
                        filter: {
                            identities: {
                                $elemMatch: {
                                    provider: provider,
                                    identity: providerAccountId,
                                },
                            },
                        },
                    })
                ).toObject();
            } catch (error: unknown) {
                return adapterCatch('getUserByAccount', error);
            }
        },

        async getUserByEmail(email) {
            try {
                return (
                    await User.find({
                        count: 1,
                        filter: { email },
                    })
                ).toObject();
            } catch (error: unknown) {
                return adapterCatch('getUserByEmail', error);
            }
        },

        async createUser({ email, name, image: avatar, emailVerified }) {
            return (
                await User.create({
                    email,
                    name: name || email,
                    avatar: avatar || undefined,
                    emailVerified,
                    identities: [],
                })
            ).toObject();
        },
        async updateUser(user) {
            console.debug('[TODO] AuthAdapter - updateUser', user);
            return user as unknown as AdapterUser;
        },
        async deleteUser(userId) {
            console.debug('[TODO] AuthAdapter - deleteUser', userId);
            return null;
        },

        async createSession({ userId, sessionToken, expires }) {
            const session = await Session.create({
                user: await User.find({
                    id: userId,
                }),
                token: sessionToken,
                expiresAt: expires,
            });

            return {
                sessionToken: session.token,
                userId: session.user.id,
                expires: session.expiresAt,
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

                // Auth.js v5 hands `account` through with snake_case fields
                // (`refresh_token` / `access_token`) per the OAuth spec
                // mapping. The previous camelCase reads silently stored
                // `undefined` for every identity, so any future provider
                // that needed those tokens to call back into its API would
                // break with no signal until it was used.
                const identity = await Identity.findOneAndUpdate(
                    {
                        provider: account.provider,
                        identity: account.providerAccountId,
                    },
                    {
                        provider: account.provider,
                        identity: account.providerAccountId,
                        scope: account.scope,
                        expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : undefined,
                        refreshToken: account.refresh_token,
                        accessToken: account.access_token,
                    },
                    {
                        upsert: true,
                        new: true,
                    },
                );
                if (!identity) {
                    return null;
                }

                if (!user.identities.find(({ id }) => id === identity.id)) {
                    user.identities.push(identity);
                    await user.save();
                }

                return {
                    userId,
                    ...account,
                };
            } catch (error: unknown) {
                // `linkAccount` returning null on a DB error caused Auth.js to
                // re-run `createUser` next time, which then failed on the
                // unique-email index — the user saw a 500 with no signal that
                // the underlying DB was unhealthy. Re-throw so the error page
                // surfaces.
                return adapterCatch('linkAccount', error);
            }
        },
        async unlinkAccount(providerAccountId) {
            console.debug('[TODO] AuthAdapter - unlinkAccount', providerAccountId);
            return;
        },
    };
}
