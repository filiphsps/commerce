import type { CollectionConfig } from 'payload';
import { rejectSecretWritesFromNonAdmins, stripSecretsOnRead } from './shops/secrets';

export const Shops: CollectionConfig = {
    slug: 'shops',
    admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'updatedAt'] },
    access: {
        read: ({ req }) => Boolean(req.user),
        create: ({ req }) => req.user?.role === 'admin',
        update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor',
        delete: ({ req }) => req.user?.role === 'admin',
    },
    hooks: {
        beforeChange: [rejectSecretWritesFromNonAdmins],
        beforeRead: [stripSecretsOnRead],
    },
    fields: [
        // ── Editable surface (mirrors shopBridge.fields) ──
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'domain', type: 'text', required: true, unique: true, index: true },
        { name: 'alternativeDomains', type: 'text', hasMany: true, index: true },
        {
            name: 'i18n',
            type: 'group',
            fields: [{ name: 'defaultLocale', type: 'text', defaultValue: 'en-US', required: true }],
        },
        {
            name: 'design',
            type: 'group',
            fields: [
                {
                    name: 'header',
                    type: 'group',
                    fields: [
                        {
                            name: 'logo',
                            type: 'group',
                            fields: [
                                { name: 'src', type: 'text', required: true },
                                { name: 'alt', type: 'text', required: true },
                                { name: 'width', type: 'number', required: true, defaultValue: 512 },
                                { name: 'height', type: 'number', required: true, defaultValue: 512 },
                            ],
                        },
                    ],
                },
                {
                    name: 'accents',
                    type: 'array',
                    fields: [
                        {
                            name: 'type',
                            type: 'select',
                            options: ['primary', 'secondary'],
                            required: true,
                        },
                        { name: 'color', type: 'text', required: true },
                        { name: 'foreground', type: 'text', required: true },
                    ],
                },
            ],
        },

        // ── Read-only / admin-managed surface (hidden in admin UI) ──

        {
            name: 'commerce',
            type: 'group',
            admin: { hidden: true },
            fields: [
                { name: 'maxQuantity', type: 'number', defaultValue: 199999 },
                { name: 'processingTimeInDays', type: 'number', defaultValue: 5 },
            ],
        },

        {
            name: 'icons',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'favicon',
                    type: 'group',
                    fields: [
                        { name: 'width', type: 'number', defaultValue: 512 },
                        { name: 'height', type: 'number', defaultValue: 512 },
                        { name: 'src', type: 'text' },
                        { name: 'alt', type: 'text' },
                    ],
                },
            ],
        },

        {
            name: 'commerceProvider',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'type',
                    type: 'select',
                    options: ['shopify', 'stripe'],
                    required: true,
                    defaultValue: 'shopify',
                },
                // Shopify-specific top-level fields (absent on stripe variant)
                { name: 'storefrontId', type: 'text' },
                { name: 'domain', type: 'text' },
                { name: 'id', type: 'text' },
                {
                    name: 'authentication',
                    type: 'group',
                    fields: [
                        // Sensitive — guarded by rejectSecretWritesFromNonAdmins / stripSecretsOnRead
                        { name: 'token', type: 'text' },
                        { name: 'publicToken', type: 'text' },
                        // Shopify storefront domain (distinct from top-level domain)
                        { name: 'domain', type: 'text' },
                        {
                            name: 'customers',
                            type: 'group',
                            fields: [
                                { name: 'id', type: 'text' },
                                { name: 'clientId', type: 'text' },
                                // Sensitive — guarded by hooks
                                { name: 'clientSecret', type: 'text' },
                            ],
                        },
                    ],
                },
            ],
        },

        {
            name: 'contentProvider',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'type',
                    type: 'select',
                    // ShopBase discriminates on 'cms' | 'shopify' | 'builder.io'
                    options: ['cms', 'shopify', 'builder.io'],
                    required: true,
                    defaultValue: 'cms',
                },
                // builder.io variant fields (absent on cms/shopify variants)
                {
                    name: 'authentication',
                    type: 'group',
                    fields: [
                        { name: 'token', type: 'text' },
                        { name: 'publicToken', type: 'text' },
                    ],
                },
            ],
        },

        {
            // integrations.judgeme is the only known integration; use a typed
            // group for fidelity. Extend with additional sub-groups if new
            // integrations are added to the Mongoose schema.
            name: 'integrations',
            type: 'group',
            admin: { hidden: true },
            fields: [
                {
                    name: 'judgeme',
                    type: 'group',
                    fields: [{ name: 'publicToken', type: 'text' }],
                },
            ],
        },

        {
            // thirdParty has known keys (googleTagManager, intercom) but treat
            // as json to accommodate future additions without schema migration.
            name: 'thirdParty',
            type: 'json',
            admin: { hidden: true },
        },

        {
            name: 'featureFlags',
            type: 'array',
            admin: { hidden: true },
            fields: [
                {
                    // 'feature-flags' collection is registered in Task 4.
                    // The cast suppresses the unknown-slug error until that lands.
                    name: 'flag',
                    type: 'relationship',
                    relationTo: 'feature-flags' as never,
                },
            ],
        },

        {
            // collaborators.permissions is string[] in the Mongoose schema,
            // not a single-value role select. Use hasMany text to preserve
            // the array shape without constraining to a fixed enum.
            name: 'collaborators',
            type: 'array',
            admin: { hidden: true },
            fields: [
                { name: 'user', type: 'text' },
                { name: 'permissions', type: 'text', hasMany: true },
            ],
        },
    ],
};
