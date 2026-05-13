import type { Block } from 'payload';

export const alertBlock: Block = {
    slug: 'alert',
    interfaceName: 'AlertBlock',
    fields: [
        {
            name: 'severity',
            type: 'select',
            defaultValue: 'info',
            required: true,
            options: [
                { label: 'Info', value: 'info' },
                { label: 'Success', value: 'success' },
                { label: 'Warning', value: 'warning' },
                { label: 'Error', value: 'error' },
            ],
        },
        { name: 'title', type: 'text', localized: true, required: true },
        { name: 'body', type: 'textarea', localized: true },
        { name: 'dismissible', type: 'checkbox', defaultValue: false },
    ],
};
