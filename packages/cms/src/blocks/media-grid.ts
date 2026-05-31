import type { Block } from 'payload';
import { arrayField, localized, required, selectField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';
import { imageField, linkField } from '../fields';

/**
 * Payload block definition for a configurable grid of media items. Each item
 * has an image, an optional caption, and an optional link. Column count and
 * item type (image vs. icon) are configurable per block instance.
 *
 * @example
 *   blocks: [mediaGridBlock]
 */
export const mediaGridBlock: Block = {
    slug: 'media-grid',
    interfaceName: 'MediaGridBlock',
    fields: toFieldConfigs(
        required(
            selectField({
                name: 'itemType',
                defaultValue: 'image',
                options: [
                    { label: 'Image', value: 'image' },
                    { label: 'Icon', value: 'icon' },
                ],
            }),
        ),
        // `min`/`max` numeric bounds are validation metadata the DSL does not model.
        { name: 'columns', type: 'number', defaultValue: 3, min: 1, max: 6 },
        arrayField({
            name: 'items',
            minRows: 1,
            fields: [
                imageField({ name: 'image' }),
                localized(textField({ name: 'caption' })),
                linkField({ name: 'link' }),
            ],
        }),
    ),
};
