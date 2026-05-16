/* c8 ignore start */
import { flag } from 'flags/next';
import { nordcomFlagAdapter } from '@/utils/flags/adapter';

const adapter = nordcomFlagAdapter<boolean>();

export const showSearchFilter = flag<boolean>({
    key: 'search-filter',
    description: 'Controls if the search filter is visible',
    defaultValue: false,
    options: [
        { label: 'Hidden', value: false },
        { label: 'Visible', value: true },
    ],
    adapter,
});

export const showProductInfoLines = flag<boolean>({
    key: 'product-page-info-lines',
    description: 'Controls if the info lines are visible on the product page',
    defaultValue: false,
    options: [
        { label: 'Hidden', value: false },
        { label: 'Visible', value: true },
    ],
    adapter,
});

export const showHeaderSearchBar = flag<boolean>({
    key: 'header-search-bar',
    description: 'Controls if the header search bar experiment is enabled',
    defaultValue: false,
    options: [
        { label: 'Off', value: false },
        { label: 'On', value: true },
    ],
    adapter,
});

export const enableProductsPage = flag<boolean>({
    key: 'products-page',
    description: 'Enable the products page',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true },
    ],
    adapter,
});

export const enableAccountsFunctionality = flag<boolean>({
    key: 'accounts-functionality',
    description: 'Enable accounts functionality',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true },
    ],
    adapter,
});
/* c8 ignore stop */
