import { ConvexError, v } from 'convex/values';

import { authedMutation, authedQuery } from '../_constructors';
import { AuthErrorCode } from '../lib/auth';

/**
 * Maximum accepted display-name length. A defensive bound on a free-text field the operator edits;
 * the source `users.name` is otherwise unconstrained.
 */
const NAME_MAX_LENGTH = 120;

/**
 * Stable {@link ConvexError} codes specific to the account-self seam (the auth-gate codes come from
 * {@link AuthErrorCode}). Lets the admin server action branch on a code rather than a message.
 */
export const AccountErrorCode = {
    /** `update` was asked to set an empty / whitespace-only / over-long display name. */
    INVALID_NAME: 'ACCOUNT_INVALID_NAME',
} as const;

/**
 * The read-only summary of a linked OAuth identity surfaced on the account page's connected-accounts
 * section — provider name, the provider-scoped id, and when it was linked. Token fields are
 * deliberately omitted: the page never needs them and they must not cross the wire.
 */
export interface AccountIdentity {
    provider: string;
    identity: string;
    createdAt: number;
}

/**
 * The caller's own account view behind the admin wire names `account/self:get` / `account/self:update`.
 * Derived from the caller's platform `users` row (resolved by the customer-tier constructor from the
 * trusted email claim), it is the exact shape the admin account page renders.
 */
export interface AccountSelf {
    name: string;
    email: string;
    emailVerified: number | null;
    createdAt: number;
    theme: 'dark' | 'system';
    identities: AccountIdentity[];
}

/**
 * Projects a `users` row into the wire {@link AccountSelf}, defaulting an absent theme preference to
 * `'system'` so the page always has a concrete selection to render.
 *
 * @param user - The caller's own `users` document.
 * @returns The account view.
 */
function toAccountSelf(user: {
    name: string;
    email: string;
    emailVerified: number | null;
    createdAt: number;
    preferences?: { theme?: 'dark' | 'system' };
    identities: Array<{ provider: string; identity: string; createdAt: number }>;
}): AccountSelf {
    return {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        theme: user.preferences?.theme ?? 'system',
        identities: user.identities.map((identity) => ({
            provider: identity.provider,
            identity: identity.identity,
            createdAt: identity.createdAt,
        })),
    };
}

/**
 * The identity-derived "my account" read behind `account/self:get`: zero client args — the caller is
 * whoever the validated bearer token says, never a spoofable argument. Built on {@link authedQuery},
 * whose customer-scoped db exposes exactly the caller's own email-keyed `users` row.
 *
 * @returns The caller's {@link AccountSelf}.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   constructor's identity resolution; `UNKNOWN_USER` when no `users` row backs the identity.
 */
export const get = authedQuery({
    args: {},
    handler: async (ctx): Promise<AccountSelf> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', ctx.identityEmail))
            .first();
        if (!user) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'No platform user matches the trusted identity.',
            });
        }
        return toAccountSelf(user);
    },
});

/**
 * The self-update behind `account/self:update`: patches the caller's OWN display name and/or theme
 * preference. The row is resolved from the trusted email claim ({@link authedMutation}'s
 * customer-scoped writer can read/patch only that one row), so the args carry new VALUES only — never
 * a target id — and a forged or replayed call can never reshape another operator's row.
 *
 * Both args are optional (partial update): an absent `name` leaves the name untouched, an absent
 * `theme` leaves the preference untouched. A present `name` is trimmed and length-validated.
 *
 * @returns The caller's fresh {@link AccountSelf} after the patch.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   constructor; `UNKNOWN_USER` when no `users` row backs the identity; `ACCOUNT_INVALID_NAME` when a
 *   supplied name is empty, whitespace-only, or longer than {@link NAME_MAX_LENGTH}.
 */
export const update = authedMutation({
    args: {
        name: v.optional(v.string()),
        theme: v.optional(v.union(v.literal('dark'), v.literal('system'))),
    },
    handler: async (ctx, { name, theme }): Promise<AccountSelf> => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', ctx.identityEmail))
            .unique();
        if (!user) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'No platform user matches the trusted identity.',
            });
        }

        const patch: { name?: string; preferences?: { theme: 'dark' | 'system' }; updatedAt?: number } = {};

        if (name !== undefined) {
            const trimmed = name.trim();
            if (trimmed.length === 0 || trimmed.length > NAME_MAX_LENGTH) {
                throw new ConvexError({
                    code: AccountErrorCode.INVALID_NAME,
                    message: `Display name must be between 1 and ${NAME_MAX_LENGTH} characters.`,
                });
            }
            patch.name = trimmed;
        }

        if (theme !== undefined) {
            patch.preferences = { ...user.preferences, theme };
        }

        if (patch.name !== undefined || patch.preferences !== undefined) {
            await ctx.db.patch(user._id, { ...patch, updatedAt: Date.now() });
        }

        const updated = await ctx.db.get(user._id);
        if (!updated) {
            throw new ConvexError({
                code: AuthErrorCode.UNKNOWN_USER,
                message: 'Account row vanished during update.',
            });
        }
        return toAccountSelf(updated);
    },
});
