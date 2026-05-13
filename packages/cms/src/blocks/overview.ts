import type { Block } from 'payload';

export const overviewBlock: Block = {
    slug: 'overview',
    interfaceName: 'OverviewBlock',
    fields: [
        {
            name: 'source',
            type: 'select',
            required: true,
            defaultValue: 'collection',
            options: [
                { label: 'Collection', value: 'collection' },
                { label: 'Latest products', value: 'latest' },
                { label: 'Featured', value: 'featured' },
            ],
        },
        {
            name: 'collectionHandle',
            type: 'text',
            admin: { condition: (_d, sib) => sib?.source === 'collection' },
        },
        { name: 'title', type: 'text', localized: true },
        { name: 'limit', type: 'number', defaultValue: 12, min: 1, max: 48 },
    ],
};
