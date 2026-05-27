import type { Field } from 'payload';

/**
 * A Payload group field that is guaranteed to carry a `name` property.
 * Used as the return type for field-builder helpers that need to be
 * composed into other field arrays without losing the group shape.
 *
 * @example
 * const myGroup: NamedGroupField = { name: 'seo', type: 'group', fields: [] };
 */
export type NamedGroupField = Extract<Field, { type: 'group' }> & { name: string };

/**
 * Builds the standard SEO group field (title, description, keywords, image,
 * noindex). Localized — content is per-locale so each language gets
 * independent metadata.
 *
 * @returns A named Payload group field config.
 *
 * @example
 * fields: [..., seoGroup()]
 */
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
