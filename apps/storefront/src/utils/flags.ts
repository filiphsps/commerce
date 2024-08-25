/* c8 ignore start */
import { get } from '@vercel/edge-config';
import { unstable_flag as flag } from '@vercel/flags/next';

export const showSearchFilter = flag({
    key: 'search-filter',
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});

export const showProductInfoLines = flag({
    key: 'search-product-info-lines',
    async decide() {
        const value = await get(this.key);
        return !!value || false;
    }
});
/* c8 ignore stop */
