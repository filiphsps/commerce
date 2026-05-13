import type { AuthStrategy, CollectionConfig } from 'payload';
import { isAdmin } from '../access';

export type BuildUsersOptions = {
    authStrategies?: AuthStrategy[];
    /** When true, disables the email+password login UI in favour of the strategies. */
    disablePasswordLogin?: boolean;
};

export const buildUsers = ({
    authStrategies = [],
    disablePasswordLogin = false,
}: BuildUsersOptions = {}): CollectionConfig => ({
    slug: 'users',
    auth: {
        strategies: authStrategies,
        disableLocalStrategy: disablePasswordLogin ? true : undefined,
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
