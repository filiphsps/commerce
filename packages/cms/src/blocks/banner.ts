import type { Block } from 'payload';
import { imageField, linkField } from '../fields';

export const bannerBlock: Block = {
    slug: 'banner',
    interfaceName: 'BannerBlock',
    fields: [
        { name: 'heading', type: 'text', localized: true, required: true },
        { name: 'subheading', type: 'text', localized: true },
        imageField({ name: 'background', localized: true }),
        linkField({ name: 'cta' }),
        {
            name: 'alignment',
            type: 'select',
            defaultValue: 'center',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
            ],
        },
    ],
};
