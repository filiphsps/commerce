import type { AuthStrategy, CollectionConfig } from 'payload';
import { convexCutoverLocked } from '../access';

/**
 * Options for {@link buildUsers}.
 *
 * @example
 *   const opts: BuildUsersOptions = { authStrategies: [oidcStrategy], disablePasswordLogin: true };
 */
export type BuildUsersOptions = {
    authStrategies?: AuthStrategy[];
    /** When true, disables the email+password login UI in favour of the strategies. */
    disablePasswordLogin?: boolean;
};

/**
 * Build the Payload `users` collection config. Isolates the auth strategy and
 * password-login toggle so different apps can share the same field schema while
 * configuring authentication differently. The collection routes its MongoDB
 * storage to `payload-users` to avoid colliding with the NextAuth `users`
 * collection registered by `@nordcom/commerce-db`.
 *
 * CUTOVER-06: user management belongs to the auth adapter surface (NextAuth +
 * the Convex `users`/`shopCollaborators` tables), not the CMS; the admin's
 * users settings pages author through the native editor and the Convex bridge.
 * Every Payload write operation is `convexCutoverLocked`. Reads stay open so
 * `payload-ctx`/`nextauth-strategy` keep resolving principals from the mirror
 * until TEARDOWN-02 removes the Payload boot path; the e2e principal seed
 * writes at the Mongo driver level and never crosses this access surface.
 *
 * @param opts - Optional auth strategies and password-login flag.
 * @returns A Payload CollectionConfig for the `users` collection.
 *
 * @example
 *   const usersCollection = buildUsers({ disablePasswordLogin: true });
 */
export const buildUsers = ({
    authStrategies = [],
    disablePasswordLogin = false,
}: BuildUsersOptions = {}): CollectionConfig => ({
    slug: 'users',
    // `@nordcom/commerce-db` already owns the MongoDB `users` collection (its
    // Mongoose `User` model is registered on the default connection and stores
    // NextAuth profiles with required `identities[].identity` sub-fields). If
    // we let Payload also default to `users`, the two write to the same physical
    // collection — Payload's create then fails Mongoose validation against the
    // foreign `identities` schema. `dbName` keeps Payload's slug stable for the
    // admin UI / multi-tenant plugin while routing storage to its own MongoDB
    // collection.
    dbName: 'payload-users',
    auth: {
        strategies: authStrategies,
        // `disableLocalStrategy: true` (boolean) strips email/password fields
        // from the collection schema entirely. We need the email field to
        // remain queryable so `getAuthedPayloadCtx` (in the admin app) can map
        // a NextAuth session to a Payload user by email, so we use the object
        // form with `enableFields: true` — that disables the password login
        // flow but keeps the fields.
        disableLocalStrategy: disablePasswordLogin ? { enableFields: true } : undefined,
    },
    admin: { useAsTitle: 'email', hidden: true },
    access: {
        read: ({ req }) => {
            if (!req?.user) return false;
            if (req.user.role === 'admin') return true;
            return { id: { equals: req.user.id } };
        },
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
        admin: ({ req }) => Boolean(req?.user),
    },
    fields: [
        {
            name: 'role',
            type: 'select',
            required: true,
            defaultValue: 'editor',
            options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
            ],
            access: { update: ({ req }) => req?.user?.role === 'admin' },
        },
        // `tenants` is added by the multi-tenant plugin.
    ],
});
