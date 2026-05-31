import type { CollectionConfig } from 'payload';
import { adminOnly, publishedOrAuthRead, tenantScopedWrite } from '../../access';
import { arrayField, emailField, groupField, required, textField } from '../../descriptors';
import { toFieldConfigs } from '../../field-config-bridge';
import { buildRevalidateHooks } from '../_hooks/revalidate';

/**
 * Payload collection config for the `businessData` singleton. Stores legal
 * name, contact details, address, and social profiles for a tenant. One
 * document per tenant, managed by the multi-tenant plugin.
 */
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
    fields: toFieldConfigs(
        textField({ name: 'legalName' }),
        emailField({ name: 'supportEmail' }),
        textField({ name: 'supportPhone' }),
        groupField({
            name: 'address',
            fields: [
                textField({ name: 'line1' }),
                textField({ name: 'line2' }),
                textField({ name: 'city' }),
                textField({ name: 'region' }),
                textField({ name: 'postalCode' }),
                textField({ name: 'country' }),
            ],
        }),
        arrayField({
            name: 'profiles',
            fields: [
                required(textField({ name: 'platform' })),
                required(textField({ name: 'handle' })),
                textField({ name: 'url' }),
            ],
        }),
    ),
    // No explicit `tenant` index: the multi-tenant plugin owns it for globals.
    hooks: buildRevalidateHooks({ collection: 'businessData' }),
};
