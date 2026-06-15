import { describe, expect, it } from 'vitest';

import config from '../next.config.js';

/**
 * Guards the routing-layer alias that keeps `/[domain]/settings/general/` reachable. The page-level
 * `redirect()` degrades to a 1s `<meta http-equiv="refresh">` under the streamed dashboard shell and
 * strands soft navigations on `/general/`; the `redirects()` rule must own the alias so the browser
 * gets a clean HTTP redirect to the shop editor instead.
 */
describe('admin next.config redirects', () => {
    it('aliases the settings general route to the shop editor at the routing layer', async () => {
        const { redirects } = config;
        if (typeof redirects !== 'function') throw new Error('next.config must define a redirects() function');

        const rules = await redirects();
        const rule = rules.find((entry) => entry.source === '/:domain/settings/general');

        expect(rule).toMatchObject({
            source: '/:domain/settings/general',
            destination: '/:domain/settings/shop/',
            permanent: false,
        });
    });
});
