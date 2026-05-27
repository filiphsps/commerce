import type { Block } from 'payload';

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
    fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'maxVendors', type: 'number', defaultValue: 12, min: 1, max: 48 },
    ],
};
