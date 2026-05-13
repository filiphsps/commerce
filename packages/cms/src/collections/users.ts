import type { CollectionConfig } from 'payload';
import { isAdmin } from '../access';

export const users: CollectionConfig = {
    slug: 'users',
    auth: true,
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
        // NOTE: the `tenants` array (linking each user to one or more tenants) is
        // injected by `@payloadcms/plugin-multi-tenant` at config-build time. Do not
        // add it here — Payload will reject the config with a DuplicateFieldName error.
    ],
};
