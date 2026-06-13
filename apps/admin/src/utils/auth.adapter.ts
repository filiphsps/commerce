import type { Adapter, AdapterAccount, AdapterUser } from '@auth/core/adapters';
import { Identity, Session, User, type UserBase } from '@nordcom/commerce-db';
import { Error as CommerceError, TodoError } from '@nordcom/commerce-errors';

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
 * triggering a duplicate-resource path. The update/delete/unlink methods the JWT session strategy never
 * exercises throw {@link TodoError} rather than no-op, so a future caller fails loudly instead of losing
 * the write silently.
 *
 * @returns An Adapter object conforming to the Auth.js adapter interface.
 * @throws {TodoError} From `updateUser`/`deleteUser`/`updateSession`/`deleteSession`/`unlinkAccount` —
 *   operations the Convex-backed seam does not implement under the JWT session strategy.
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
        // The Convex-backed auth seam is frozen to the vocabulary the JWT session
        // strategy (auth.ts: `session.strategy: 'jwt'`) actually exercises — create,
        // the id/email/provider lookups, and the `$push: { identities }` link. It
        // exposes no user/session update-or-delete mutation. These adapter methods
        // were silent no-ops that returned success while persisting nothing — a
        // data-loss trap if a future flow (account management, the database session
        // strategy) ever called them. Fail loud with the same typed error the db
        // seam throws for an unsupported operation, so the gap surfaces at the first
        // call instead of as quietly-dropped writes.
        async updateUser(user) {
            throw new TodoError(
                `AuthAdapter.updateUser is unsupported on the Convex-backed auth seam (JWT strategy; no users:update mutation): ${user.id}`,
            );
        },
        async deleteUser(userId) {
            throw new TodoError(
                `AuthAdapter.deleteUser is unsupported on the Convex-backed auth seam (JWT strategy; no users:delete mutation): ${userId}`,
            );
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
            throw new TodoError(
                `AuthAdapter.updateSession is unsupported on the Convex-backed auth seam (JWT strategy keeps no server-side sessions): ${session.sessionToken}`,
            );
        },
        async deleteSession(sessionToken) {
            throw new TodoError(
                `AuthAdapter.deleteSession is unsupported on the Convex-backed auth seam (JWT strategy keeps no server-side sessions): ${sessionToken}`,
            );
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
            throw new TodoError(
                `AuthAdapter.unlinkAccount is unsupported on the Convex-backed auth seam (no users:unlinkIdentity mutation): ${JSON.stringify(providerAccountId)}`,
            );
        },
    };
}
