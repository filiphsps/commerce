import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from '../access';
import { imageField, seoGroup } from '../fields';
import { buildRevalidateHooks } from './_hooks/revalidate';

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
    fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'slug', type: 'text', required: true, index: true },
        { name: 'author', type: 'text', required: true },
        { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        imageField({ name: 'cover' }),
        { name: 'excerpt', type: 'textarea', localized: true },
        { name: 'body', type: 'richText', localized: true, editor: lexicalEditor({}) },
        { name: 'tags', type: 'text', hasMany: true },
        seoGroup(),
    ],
    indexes: [{ fields: ['tenant', 'slug'], unique: true }],
    hooks: buildRevalidateHooks({ collection: 'articles' }),
};
