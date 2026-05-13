import type { Field } from 'payload';

export type NamedGroupField = Extract<Field, { type: 'group' }> & { name: string };

export const seoGroup = (): NamedGroupField => ({
    name: 'seo',
    type: 'group',
    localized: true,
    fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'keywords', type: 'text', hasMany: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'noindex', type: 'checkbox', defaultValue: false },
    ],
});
