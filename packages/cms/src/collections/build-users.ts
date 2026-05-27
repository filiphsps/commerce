import type { AuthStrategy, CollectionConfig } from 'payload';
import { isAdmin } from '../access';

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
    admin: { useAsTitle: 'email' },
    access: {
        read: ({ req }) => {
            if (!req?.user) return false;
            if (req.user.role === 'admin') return true;
            return { id: { equals: req.user.id } };
        },
        create: isAdmin,
        update: ({ req }) => {
            if (!req?.user) return false;
            if (req.user.role === 'admin') return true;
            return { id: { equals: req.user.id } };
        },
        delete: isAdmin,
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
