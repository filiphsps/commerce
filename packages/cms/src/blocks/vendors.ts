import type { Block } from 'payload';
import { localized, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

/**
 * Payload block definition for a vendor-logo showcase section. Displays up to
 * `maxVendors` unique vendor entries sourced from Shopify products.
 *
 * @example
 *   blocks: [vendorsBlock]
 */
export const vendorsBlock: Block = {
    slug: 'vendors',
    interfaceName: 'VendorsBlock',
    fields: toFieldConfigs(
        localized(textField({ name: 'title' })),
        // `min`/`max` numeric bounds are validation metadata the DSL does not model.
        { name: 'maxVendors', type: 'number', defaultValue: 12, min: 1, max: 48 },
    ),
};
