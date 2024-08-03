import { get } from '@vercel/edge-config';
import { unstable_flag as flag } from '@vercel/flags/next';

export const showSearchFilter = flag({
    key: 'search-filter',
    async decide() {
        const value = await get(this.key);
        return !!value ?? false;
    }
});
