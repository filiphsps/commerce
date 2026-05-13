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
        {
            name: 'tenants',
            type: 'array',
            fields: [{ name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true }],
        },
    ],
};
