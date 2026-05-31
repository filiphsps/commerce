import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';
import { localized, required, textareaField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';
import { imageField, seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

/**
 * Payload collection config for `articles`. Tenant-scoped blog posts with
 * draft/autosave/version support, Lexical rich-text body, tags, and an SEO
 * group. The `(tenant, slug)` compound index enforces per-tenant slug
 * uniqueness.
 */
export const articles: CollectionConfig = {
    slug: 'articles',
    versions: { drafts: { autosave: { interval: 2000 } } },
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'publishedAt', '_status'] },
    access: {
        read: tenantScopedRead,
        create: tenantScopedWrite,
        update: tenantScopedWrite,
        delete: adminOnly,
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
        // `richText`/Lexical has no descriptor equivalent yet; kept raw with its
        // `localized` flag intact so the localized-field set is preserved.
        { name: 'body', type: 'richText', localized: true, editor: lexicalEditor({}) },
        textField({ name: 'tags', hasMany: true }),
        seoGroup(),
    ),
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'articles' }),
};
