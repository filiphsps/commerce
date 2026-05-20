import 'server-only';
import { defineFlag } from '../define';

export const productsPage = defineFlag<boolean>({
    key: 'products-page',
    description: 'Enable the products page',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true },
    ],
});
