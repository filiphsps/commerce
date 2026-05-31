import type { Block } from 'payload';
import { condition, localized, required, selectField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

/**
 * Payload block definition for a Shopify product overview section. Supports
 * three data sources — a specific collection handle, latest products, or
 * featured products — with a configurable item limit.
 *
 * @example
 *   blocks: [overviewBlock]
 */
export const overviewBlock: Block = {
    slug: 'overview',
    interfaceName: 'OverviewBlock',
    fields: toFieldConfigs(
        required(
            selectField({
                name: 'source',
                defaultValue: 'collection',
                options: [
                    { label: 'Collection', value: 'collection' },
                    { label: 'Latest products', value: 'latest' },
                    { label: 'Featured', value: 'featured' },
                ],
            }),
        ),
        condition(textField({ name: 'collectionHandle' }), (_data, sibling) => sibling.source === 'collection'),
        localized(textField({ name: 'title' })),
        // `min`/`max` numeric bounds are validation metadata the DSL does not model.
        { name: 'limit', type: 'number', defaultValue: 12, min: 1, max: 48 },
    ),
};
