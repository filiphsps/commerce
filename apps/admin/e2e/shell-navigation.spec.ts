import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * Shell navigation affordances through the REAL admin app: the command palette executes a navigation
 * command, and the shop switcher opens and routes to connecting a new shop.
 */
test.describe('Shell navigation', () => {
    test('the command palette navigates to a selected command', async ({ page }) => {
        await page.goto(`/${DOMAIN}/`);

        // The ⌘K handler attaches on hydration; retry until the palette opens (a one-shot global
        // keypress fired before the listener is live is simply lost).
        await expect(async () => {
            await page.keyboard.press('Meta+k');
            await expect(page.getByPlaceholder(/Type a command/i)).toBeVisible({ timeout: 2_000 });
        }).toPass({ timeout: 15_000 });

        await page.getByPlaceholder(/Type a command/i).fill('Reviews');
        await page
            .getByRole('option', { name: /Reviews/i })
            .first()
            .click();
        await expect(page).toHaveURL(new RegExp(`/${DOMAIN}/reviews`));
    });

    test('the shop switcher opens and routes to connecting a new shop', async ({ page }) => {
        await page.goto(`/${DOMAIN}/`);
        await page
            .getByRole('button', { name: /Nordcom Demo Shop/i })
            .first()
            .click();
        await expect(page.getByText('Switch shop')).toBeVisible();

        await page.getByRole('menuitem', { name: /Connect a new Shop/i }).click();
        await expect(page).toHaveURL(/\/new\/?$/);
    });
});
