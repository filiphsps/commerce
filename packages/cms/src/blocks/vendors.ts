import type { Block } from 'payload';

export const vendorsBlock: Block = {
    slug: 'vendors',
    interfaceName: 'VendorsBlock',
    fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'maxVendors', type: 'number', defaultValue: 12, min: 1, max: 48 },
    ],
};
