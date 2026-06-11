import type { CollectionConfig } from 'payload';
import { convexCutoverLocked, publishedOrAuthRead } from '../../access';
import { checkboxField, groupField, localized, textField } from '../../descriptors';
import { toFieldConfigs } from '../../field-config-bridge';
import { imageField, linkField, topLevelNavItemField } from '../../fields';
import { buildRevalidateHooks } from '../_hooks/revalidate';

/**
 * Payload collection config for the `header` singleton. Stores logo, top-level
 * navigation items (with variant picker for mega-menu layout), locale switcher
 * config, and a CTA link. One document per tenant, managed by the multi-tenant
 * plugin.
 *
 * CUTOVER-04: authoring lives in the Convex-native editor; every Payload write
 * operation is `convexCutoverLocked` so the inert Mongo snapshot can never fork
 * from the Convex authority. Reads stay published-or-auth for the storefront's
 * emergency-shadow leg until TEARDOWN-02 removes the collection entirely.
 */
export const header: CollectionConfig = {
    slug: 'header',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { hidden: true },
    access: {
        // Anonymous storefront reads are restricted to `_status: published` so
        // autosaved drafts (every 2s while an editor types) don't leak to
        // public visitors.
        read: publishedOrAuthRead,
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    fields: toFieldConfigs(
        imageField({ name: 'logo' }),
        textField({ name: 'logoLink', defaultValue: '/' }),
        topLevelNavItemField({ depth: 6 }),
        groupField({
            name: 'localeSwitcher',
            fields: [checkboxField({ name: 'enabled', defaultValue: true }), localized(textField({ name: 'label' }))],
        }),
        linkField({ name: 'cta' }),
    ),
    // No explicit `tenant` index: @payloadcms/plugin-multi-tenant adds a unique
    // tenant index automatically when `isGlobal: true` is set on the collection.
    hooks: buildRevalidateHooks({ collection: 'header' }),
};
