import type { Block } from 'payload';

/**
 * Payload block definition that embeds a Shopify collection in a page by its
 * handle. Supports grid and carousel layouts with a configurable item limit.
 *
 * @example
 *   blocks: [collectionBlock]
 */
export const collectionBlock: Block = {
    slug: 'collection',
    interfaceName: 'CollectionBlock',
    fields: [
        { name: 'handle', type: 'text', required: true, admin: { description: 'Shopify collection handle' } },
        { name: 'title', type: 'text', localized: true },
        {
            name: 'layout',
            type: 'select',
            defaultValue: 'grid',
            options: [
                { label: 'Grid', value: 'grid' },
                { label: 'Carousel', value: 'carousel' },
            ],
        },
        { name: 'limit', type: 'number', defaultValue: 8, min: 1, max: 48 },
    ],
};
