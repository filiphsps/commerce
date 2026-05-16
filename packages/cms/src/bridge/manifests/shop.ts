import { type OnlineShop, Shop } from '@nordcom/commerce-db';
import { adminOnly, tenantMemberCanRead } from '../access';
import { defaultToPlain, mongooseAdapter } from '../adapter-mongoose';
import { type BridgeAdapter, defineBridge } from '../manifest';

// ---- Redaction ----

type ShopWithSecrets = Record<string, unknown> & {
    commerceProvider?: {
        type?: string;
        authentication?: {
            token?: string;
            publicToken?: string;
            domain?: string;
            customers?: { id?: string; clientId?: string; clientSecret?: string };
        };
    };
};

export const stripCommerceProviderSecrets = <T extends Record<string, unknown>>(doc: T): T => {
    const cp = (doc as ShopWithSecrets).commerceProvider;
    if (!cp) return doc;
    const auth = cp.authentication;
    if (!auth) return doc;
    const { token: _t, customers, ...restAuth } = auth;
    const newAuth: Record<string, unknown> = { ...restAuth };
    if (customers) {
        const { clientSecret: _cs, ...restCustomers } = customers;
        newAuth.customers = restCustomers;
    }
    return {
        ...doc,
        commerceProvider: { ...cp, authentication: newAuth },
    } as T;
};

// ---- Domain lookup wrapper ----
//
// `Shop.findByDomain` matches on `domain` OR any entry in `alternativeDomains`.
// The default mongooseAdapter only single-keys. This wrapper preserves the
// `mongooseAdapter`'s update/delete semantics (by `_id`) but overrides
// `findById` to mirror Shop.findByDomain's `$or`.

const domainLookupAdapter = (): BridgeAdapter<OnlineShop> => {
    const base = mongooseAdapter<OnlineShop>(Shop.model, {
        redact: (doc) => stripCommerceProviderSecrets(doc),
    });
    return {
        ...base,
        async findById(domain) {
            const doc = await Shop.model.findOne({ $or: [{ domain }, { alternativeDomains: domain }] }).exec();
            if (!doc) return null;
            return stripCommerceProviderSecrets(defaultToPlain(doc)) as OnlineShop;
        },
    };
};

// ---- Manifest ----

export const shopBridge = defineBridge<OnlineShop>({
    slug: 'shop',
    label: { singular: 'Shop', plural: 'Shops' },
    fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'domain', type: 'text', required: true },
        { name: 'alternativeDomains', type: 'text', hasMany: true },
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
                        { name: 'type', type: 'select', options: ['primary', 'secondary'], required: true },
                        { name: 'color', type: 'text', required: true },
                        { name: 'foreground', type: 'text', required: true },
                    ],
                },
            ],
        },
    ],
    adapter: domainLookupAdapter(),
    access: {
        read: tenantMemberCanRead,
        update: adminOnly,
        delete: adminOnly,
    },
});
