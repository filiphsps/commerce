import { get } from '@vercel/edge-config';
import { unstable_flag as flag } from '@vercel/flags/next';

export const showSearchFilter = flag<boolean>({
    key: 'search-filter',
    defaultValue: false,
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});

export const showProductInfoLines = flag<boolean>({
    key: 'product-page-info-lines',
    defaultValue: false,
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});

export const showHeaderSearchBar = flag<boolean>({
    key: 'header-search-bar',
    defaultValue: false,
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});

export const enableProductsPage = flag<boolean>({
    key: 'products-page',
    description: 'Enable the products page.',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true }
    ],
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});

export const enableAccountsFunctionality = flag<boolean>({
    key: 'accounts-functionality',
    description: 'Enable Accounts functionality',
    defaultValue: false,
    options: [
        { label: 'Disabled', value: false },
        { label: 'Enabled', value: true }
    ],
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});
/* c8 ignore stop */
