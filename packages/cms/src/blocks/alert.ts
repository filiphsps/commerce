import type { Block } from 'payload';

/**
 * Payload block definition for inline alert banners. Supports four severity
 * levels (info, success, warning, error), an optional body, and an optional
 * dismiss toggle.
 *
 * @example
 *   blocks: [alertBlock]
 */
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
