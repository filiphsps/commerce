import type { GroupFieldDescriptor } from '../descriptors';
import { checkboxField, groupField, textareaField, textField, uploadField } from '../descriptors';

/**
 * Shared return-type name for the group-producing field builders ({@link seoGroup}
 * and `linkField`). An alias of {@link GroupFieldDescriptor} — kept so those
 * builders read with a domain-meaningful type at their call sites.
 *
 * @example
 * const myGroup: NamedGroupField = { name: 'seo', type: 'group', fields: [] };
 */
export type NamedGroupField = GroupFieldDescriptor;

/**
 * Builds the standard SEO group field (title, description, keywords, image,
 * noindex). Localized — content is per-locale so each language gets
 * independent metadata.
 *
 * @returns A named group field descriptor.
 *
 * @example
 * fields: [..., seoGroup()]
 */
export const seoGroup = (): NamedGroupField =>
    groupField({
        name: 'seo',
        localized: true,
        fields: [
            textField({ name: 'title' }),
            textareaField({ name: 'description' }),
            textField({ name: 'keywords', hasMany: true }),
            uploadField({ name: 'image', relationTo: 'media' }),
            checkboxField({ name: 'noindex', defaultValue: false }),
        ],
    });
