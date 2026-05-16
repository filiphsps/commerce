import type { CollectionConfig } from 'payload';

export const featureFlags: CollectionConfig = {
    slug: 'feature-flags',
    admin: { useAsTitle: 'key', defaultColumns: ['key', 'description', 'updatedAt'] },
    access: {
        read: ({ req }) => Boolean(req.user),
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin',
        delete: ({ req }) => req.user?.role === 'admin',
    },
    fields: [
        { name: 'key', type: 'text', required: true, unique: true, index: true },
        { name: 'description', type: 'textarea' },
        { name: 'defaultValue', type: 'json', required: true },
        {
            name: 'options',
            type: 'array',
            fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'value', type: 'json', required: true },
            ],
        },
        {
            name: 'targeting',
            type: 'array',
            fields: [
                { name: 'rule', type: 'text', required: true },
                { name: 'params', type: 'json', required: true, defaultValue: {} },
                { name: 'value', type: 'json', required: true },
                { name: 'description', type: 'text' },
            ],
        },
    ],
};
