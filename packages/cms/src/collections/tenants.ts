import type { CollectionConfig } from 'payload';
import { isAdmin } from '../access';
import { required, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

/**
 * Payload collection config for `tenants`. Required by
 * `@payloadcms/plugin-multi-tenant` — each row maps to one storefront tenant
 * and carries locale configuration plus a back-reference to the source
 * `Shop._id` in `@nordcom/commerce-db`. Publicly readable; write operations
 * are admin-only.
 */
export const tenants: CollectionConfig = {
    slug: 'tenants',
    admin: { useAsTitle: 'name' },
    access: {
        read: () => true,
        create: isAdmin,
        update: isAdmin,
        delete: isAdmin,
    },
    fields: toFieldConfigs(
        required(textField({ name: 'name' })),
        // `unique`/`index` are storage concerns the descriptor DSL does not model.
        { name: 'slug', type: 'text', required: true, unique: true, index: true },
        required(textField({ name: 'defaultLocale', defaultValue: 'en-US' })),
        // A `hasMany` text default is an array; the descriptor's `defaultValue` is
        // a single string, so this field is kept raw to preserve the array default.
        { name: 'locales', type: 'text', hasMany: true, required: true, defaultValue: ['en-US'] },
        {
            name: 'shopId',
            type: 'text',
            index: true,
            admin: { description: 'Source Shop._id from @nordcom/commerce-db' },
        },
    ),
};
