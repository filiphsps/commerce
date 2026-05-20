import 'server-only';
import { defineFlag } from '../define';

export const productInfoLines = defineFlag<boolean>({
    key: 'product-page-info-lines',
    description: 'Controls if the info lines are visible on the product page',
    defaultValue: false,
    options: [
        { label: 'Hidden', value: false },
        { label: 'Visible', value: true },
    ],
});
