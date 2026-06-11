import type { CollectionConfig } from 'payload';
import { convexCutoverLocked, tenantScopedRead } from '../access';
import { localized, required, textareaField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';
import { imageField, seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

/**
 * Payload collection config for `articles`. Tenant-scoped blog posts with
 * draft/autosave/version support, ProseMirror rich-text body, tags, and an SEO
 * group. The `(tenant, slug)` compound index enforces per-tenant slug
 * uniqueness.
 *
 * CUTOVER-05: authoring lives in the Convex-native editor; every Payload write
 * operation is `convexCutoverLocked` so the inert Mongo snapshot can never fork
 * from the Convex authority. Reads stay tenant-scoped for the storefront's
 * emergency-shadow leg until TEARDOWN-02 removes the collection entirely.
 */
export const articles: CollectionConfig = {
    slug: 'articles',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'publishedAt', '_status'], hidden: true },
    access: {
        read: tenantScopedRead,
        create: convexCutoverLocked,
        update: convexCutoverLocked,
        delete: convexCutoverLocked,
    },
    fields: toFieldConfigs(
        localized(required(textField({ name: 'title' }))),
        // `index` is a storage concern the descriptor DSL does not model; the raw
        // Payload field is mixed through the bridge until the Convex rebuild.
        { name: 'slug', type: 'text', required: true, index: true },
        required(textField({ name: 'author' })),
        // `admin.date` picker config is Payload editor-presentation metadata the
        // descriptor DSL intentionally omits.
        { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        imageField({ name: 'cover' }),
        localized(textareaField({ name: 'excerpt' })),
        // Rich text is authored with ProseMirror/Tiptap (CMSRICH-01) and stored as ProseMirror
        // JSON, so the body is a localized `json` field.
        { name: 'body', type: 'json', localized: true },
        textField({ name: 'tags', hasMany: true }),
        seoGroup(),
    ),
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'articles' }),
};
