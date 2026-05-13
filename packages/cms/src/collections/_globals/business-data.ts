import type { CollectionConfig } from 'payload';
import { adminOnly, publishedOrAuthRead, tenantScopedWrite } from '../../access';
import { buildRevalidateHooks } from '../_hooks/revalidate';

export const businessData: CollectionConfig = {
    slug: 'businessData',
    versions: { drafts: { autosave: { interval: 2000 } } },
    access: {
        // See header.ts for rationale — autosaved drafts must not leak to anon
        // storefront reads.
        read: publishedOrAuthRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
    },
    fields: [
        { name: 'legalName', type: 'text' },
        { name: 'supportEmail', type: 'email' },
        { name: 'supportPhone', type: 'text' },
        {
            name: 'address',
            type: 'group',
            fields: [
                { name: 'line1', type: 'text' },
                { name: 'line2', type: 'text' },
                { name: 'city', type: 'text' },
                { name: 'region', type: 'text' },
                { name: 'postalCode', type: 'text' },
                { name: 'country', type: 'text' },
            ],
        },
        {
            name: 'profiles',
            type: 'array',
            fields: [
                { name: 'platform', type: 'text', required: true },
                { name: 'handle', type: 'text', required: true },
                { name: 'url', type: 'text' },
            ],
        },
    ],
    // No explicit `tenant` index: the multi-tenant plugin owns it for globals.
    hooks: buildRevalidateHooks({ collection: 'businessData' }),
};
