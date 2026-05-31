import type { Block } from 'payload';
import { localized, required, selectField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';
import { imageField, linkField } from '../fields';

/**
 * Payload block definition for full-width banner sections with a heading,
 * optional subheading, background image, CTA link, and text alignment.
 *
 * @example
 *   blocks: [bannerBlock]
 */
export const bannerBlock: Block = {
    slug: 'banner',
    interfaceName: 'BannerBlock',
    fields: toFieldConfigs(
        localized(required(textField({ name: 'heading' }))),
        localized(textField({ name: 'subheading' })),
        imageField({ name: 'background', localized: true }),
        linkField({ name: 'cta' }),
        selectField({
            name: 'alignment',
            defaultValue: 'center',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
            ],
        }),
    ),
};
