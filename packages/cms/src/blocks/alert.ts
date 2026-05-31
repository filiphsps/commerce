import type { Block } from 'payload';
import { checkboxField, localized, required, selectField, textareaField, textField } from '../descriptors';
import { toFieldConfigs } from '../field-config-bridge';

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
    fields: toFieldConfigs(
        required(
            selectField({
                name: 'severity',
                defaultValue: 'info',
                options: [
                    { label: 'Info', value: 'info' },
                    { label: 'Success', value: 'success' },
                    { label: 'Warning', value: 'warning' },
                    { label: 'Error', value: 'error' },
                ],
            }),
        ),
        localized(required(textField({ name: 'title' }))),
        localized(textareaField({ name: 'body' })),
        checkboxField({ name: 'dismissible', defaultValue: false }),
    ),
};
