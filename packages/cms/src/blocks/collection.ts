import type { Block } from 'payload';
import { localized, selectField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

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
    fields: toFieldConfigs(
        // `admin.description` is editor-presentation metadata the descriptor DSL
        // omits; the raw field is mixed through the bridge until the Convex rebuild.
        { name: 'handle', type: 'text', required: true, admin: { description: 'Shopify collection handle' } },
        localized(textField({ name: 'title' })),
        selectField({
            name: 'layout',
            defaultValue: 'grid',
            options: [
                { label: 'Grid', value: 'grid' },
                { label: 'Carousel', value: 'carousel' },
            ],
        }),
        // `min`/`max` numeric bounds are validation metadata the DSL does not model.
        { name: 'limit', type: 'number', defaultValue: 8, min: 1, max: 48 },
    ),
};
