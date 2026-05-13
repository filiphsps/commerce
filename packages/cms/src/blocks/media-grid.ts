import type { Block } from 'payload';
import { imageField, linkField } from '../fields';

export const mediaGridBlock: Block = {
    slug: 'media-grid',
    interfaceName: 'MediaGridBlock',
    fields: [
        {
            name: 'itemType',
            type: 'select',
            defaultValue: 'image',
            required: true,
            options: [
                { label: 'Image', value: 'image' },
                { label: 'Icon', value: 'icon' },
            ],
        },
        { name: 'columns', type: 'number', defaultValue: 3, min: 1, max: 6 },
        {
            name: 'items',
            type: 'array',
            minRows: 1,
            fields: [
                imageField({ name: 'image' }),
                { name: 'caption', type: 'text', localized: true },
                linkField({ name: 'link' }),
            ],
        },
    ],
};
