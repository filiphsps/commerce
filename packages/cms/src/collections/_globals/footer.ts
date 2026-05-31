import type { CollectionConfig } from 'payload';
import { adminOnly, publishedOrAuthRead, tenantScopedWrite } from '../../access';
import { arrayField, localized, required, selectField, textField } from '../../descriptors';
import { toFieldConfigs } from '../../field-config-bridge';
import { linkField } from '../../fields';
import { buildRevalidateHooks } from '../_hooks/revalidate';

/**
 * Payload collection config for the `footer` singleton. Stores navigation
 * sections, social links, legal links, and a copyright line. One document per
 * tenant, managed by the multi-tenant plugin.
 */
export const footer: CollectionConfig = {
    slug: 'footer',
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
        arrayField({
            name: 'sections',
            fields: [
                localized(required(textField({ name: 'title' }))),
                arrayField({ name: 'links', fields: [linkField({ name: 'link' })] }),
            ],
        }),
        arrayField({
            name: 'social',
            fields: [
                required(
                    selectField({
                        name: 'platform',
                        options: [
                            { label: 'Instagram', value: 'instagram' },
                            { label: 'Facebook', value: 'facebook' },
                            { label: 'TikTok', value: 'tiktok' },
                            { label: 'YouTube', value: 'youtube' },
                            { label: 'X / Twitter', value: 'x' },
                            { label: 'LinkedIn', value: 'linkedin' },
                        ],
                    }),
                ),
                required(textField({ name: 'url' })),
            ],
        }),
        arrayField({ name: 'legal', fields: [linkField({ name: 'link' })] }),
        localized(textField({ name: 'copyrightLine' })),
    ),
    // No explicit `tenant` index: the multi-tenant plugin owns it for globals.
    hooks: buildRevalidateHooks({ collection: 'footer' }),
};
