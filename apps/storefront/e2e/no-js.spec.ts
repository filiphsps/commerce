import { expect, test } from '@playwright/test';

import { productPath } from './fixtures/storefront';

/**
 * Server-rendered content survives without JavaScript: the PDP's title is emitted in the initial HTML
 * (outside the client-resolved Suspense boundaries that stream the interactive pricing/cart UI), so a
 * scripting-disabled visitor still sees the core product identity.
 */
test.use({ javaScriptEnabled: false });

test.describe('No-JS rendering', () => {
    test('the PDP renders its title without JavaScript', async ({ page }) => {
        await page.goto(productPath(), { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toHaveText(/sweatpants/i, { timeout: 30_000 });
    });
});
