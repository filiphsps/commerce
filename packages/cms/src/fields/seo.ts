import type { GroupFieldDescriptor } from '../descriptors';
import { checkboxField, groupField, localized, textareaField, textField, uploadField } from '../descriptors';

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
 * noindex). Localization is LEAF-LEVEL on the text members (title, description,
 * keywords) so each language gets independent metadata; the shared image and
 * noindex toggle are locale-invariant. The group itself is never localized —
 * composite localization is rejected by the descriptor system (G4FIX-03).
 *
 * @returns A named group field descriptor.
 *
 * @example
 * fields: [..., seoGroup()]
 */
export const seoGroup = (): NamedGroupField =>
    groupField({
        name: 'seo',
        fields: [
            localized(textField({ name: 'title' })),
            localized(textareaField({ name: 'description' })),
            localized(textField({ name: 'keywords', hasMany: true })),
            uploadField({ name: 'image', relationTo: 'media' }),
            checkboxField({ name: 'noindex', defaultValue: false }),
        ],
    });
