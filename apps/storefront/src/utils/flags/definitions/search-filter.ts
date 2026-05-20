import 'server-only';
import { defineFlag } from '../define';

export const searchFilter = defineFlag<boolean>({
    key: 'search-filter',
    description: 'Controls if the search filter is visible',
    defaultValue: false,
    options: [
        { label: 'Hidden', value: false },
        { label: 'Visible', value: true },
    ],
});
