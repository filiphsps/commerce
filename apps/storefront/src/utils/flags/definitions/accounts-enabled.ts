import 'server-only';
import { defineFlag } from '../define';

/**
 * Flag controlling whether shopper account features (login, order history, address book) are presented.
 *
 * @returns `true` when accounts functionality is active for the current request context.
 */
export const accountsEnabled = defineFlag<boolean>({
    key: 'accounts-functionality',
    description: 'Enable accounts functionality',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true },
    ],
});
