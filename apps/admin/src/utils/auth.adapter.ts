import type { Adapter, AdapterAccount, AdapterUser } from '@auth/core/adapters';
import { Identity, Session, User, type UserBase } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';

// `null` is the adapter contract for "no such user/account" — Auth.js then
// triggers user creation. The previous implementation also returned `null` on
// real DB errors (timeout, election, pool saturation), which silently
// triggered user creation against a flapping backend and produced
// duplicate-key blowups one step downstream. Distinguish "not found" (return
// null) from "infra failed" (re-throw) so Auth.js shows the real error page
// instead of mutating state under a partial failure.
const adapterCatch = (op: string, error: unknown): null => {
    if (CommerceError.isNotFound(error)) return null;
    console.error(`[auth-adapter] ${op} failed:`, error);
    throw error;
};

/**
 * Projects a commerce-db `UserBase` row onto the Auth.js `AdapterUser` shape.
 *
 * Reads only plain fields (`id`, `email`, `name`, `avatar`, `emailVerified`), so it works against the
 * Convex-backed seam's plain rows the same as it did against a Mongoose document — replacing the
 * Mongoose-only `.toObject()` conversion the previous adapter relied on. `avatar` maps to Auth.js's
 * `image`, and both `image`/`emailVerified` collapse `undefined` to `null` to match the adapter contract.
 *
 * @param user - The commerce-db user row resolved through the {@link User} service seam.
 * @returns The user in Auth.js `AdapterUser` shape.
 */
function toAdapterUser(user: UserBase): AdapterUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatar ?? null,
        emailVerified: user.emailVerified ?? null,
    };
}

/**
 * Constructs an Auth.js adapter backed by the commerce-db User, Session, and Identity service seam.
 *
 * The seam exposes the same frozen signatures whether it is Mongoose- or Convex-backed, so this adapter
 * reads only plain rows (no Mongoose document methods) and projects them with {@link toAdapterUser}.
 * Returns null (not throws) for "not found" results to signal Auth.js to create a new resource;
 * re-throws all other errors so infrastructure failures surface at the error page rather than silently
 * triggering a duplicate-resource path.
 *
 * @returns An Adapter object conforming to the Auth.js adapter interface.
 */
export function AuthAdapter(): Adapter {
    return {
        async getUser(id) {
            try {
                return toAdapterUser(await User.find({ id }));
            } catch (error: unknown) {
                return adapterCatch('getUser', error);
            }
        },

        async getUserByAccount({
            providerAccountId,
            provider,
        }: Pick<AdapterAccount, 'provider' | 'providerAccountId'>) {
            try {
                return toAdapterUser(
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
                    }),
                );
            } catch (error: unknown) {
                return adapterCatch('getUserByAccount', error);
            }
        },

        async getUserByEmail(email) {
            try {
                return toAdapterUser(
                    await User.find({
                        count: 1,
                        filter: { email },
                    }),
                );
            } catch (error: unknown) {
                return adapterCatch('getUserByEmail', error);
            }
        },

        async createUser({ email, name, image: avatar, emailVerified }) {
            return toAdapterUser(
                await User.create({
                    email,
                    name: name || email,
                    avatar: avatar || undefined,
                    emailVerified,
                    identities: [],
                }),
            );
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
                user: await User.find({ id: userId }),
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

                if (!user.identities.some(({ id }) => id === identity.id)) {
                    // Persist the link onto the user's embedded identity list
                    // through the seam's declarative update rather than a
                    // Mongoose `document.save()`: the Convex-backed seam returns
                    // plain rows with no document methods, so the append must be
                    // expressed as an update, not a mutated-and-saved document.
                    await User.findOneAndUpdate({ _id: userId }, { $push: { identities: identity } });
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
