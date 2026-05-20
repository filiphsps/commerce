import 'server-only';
import { defineFlag } from '../define';

export const accountsEnabled = defineFlag<boolean>({
    key: 'accounts-functionality',
    description: 'Enable accounts functionality',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true },
    ],
});
