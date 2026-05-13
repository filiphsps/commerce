import type { CollectionConfig } from 'payload';
import { isAdmin } from '../access';

export const tenants: CollectionConfig = {
    slug: 'tenants',
    admin: { useAsTitle: 'name' },
    access: {
        read: () => true,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin,
    },
    fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'slug', type: 'text', required: true, unique: true, index: true },
        { name: 'defaultLocale', type: 'text', required: true, defaultValue: 'en-US' },
        { name: 'locales', type: 'text', hasMany: true, required: true, defaultValue: ['en-US'] },
        {
            name: 'shopId',
            type: 'text',
            index: true,
            admin: { description: 'Source Shop._id from @nordcom/commerce-db' },
        },
    ],
};
