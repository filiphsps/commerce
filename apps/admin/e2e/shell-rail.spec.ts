import { expect, test } from '@playwright/test';

import { DOMAIN } from './fixtures/editor';

/**
 * Navigation shell affordances introduced with the rail redesign, driven through the REAL admin app:
 * the primary rail resolves a single active section (no more parent/child double-highlight), the
 * header shows a contextual section crumb, and the command palette surfaces an Actions group plus a
 * recent-section trail.
 */
test.describe('Shell rail & navigation', () => {
    test('the rail marks only the most specific section active (Settings vs. Users)', async ({ page }) => {
        await page.goto(`/${DOMAIN}/settings/users/`);

        const rail = page.getByRole('navigation', { name: 'Primary' });
        await expect(rail).toBeVisible();

        // Exactly one rail link is current, and it is the deepest match — Users, not its Settings parent.
        const current = rail.locator('a[aria-current="page"]');
        await expect(current).toHaveCount(1);
        await expect(current).toHaveAccessibleName(/Users/);
        await expect(rail.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current', 'page');
    });

    test('the header shows a contextual section crumb for the active section', async ({ page }) => {
        await page.goto(`/${DOMAIN}/content/`);
        const crumb = page.getByTestId('section-crumb');
        await expect(crumb).toBeVisible();
        await expect(crumb).toHaveText(/Content/i);
    });

    test('the command palette surfaces an Actions group and a recent-section trail', async ({ page }) => {
        // Build a recent trail: visiting each section records it (the palette is mounted in the header).
        // Wait for each page to settle so the recording effect runs before we open the palette — a
        // race that otherwise drops Products from the trail under CI load.
        await page.goto(`/${DOMAIN}/products/`);
        await page.waitForLoadState('networkidle');
        await page.goto(`/${DOMAIN}/reviews/`);
        await page.waitForLoadState('networkidle');

        // The ⌘K handler attaches on hydration; retry until the palette opens (a one-shot global
        // keypress fired before the listener is live is simply lost).
        await expect(async () => {
            await page.keyboard.press('Meta+k');
            await expect(page.getByPlaceholder(/Type a command/i)).toBeVisible({ timeout: 2_000 });
        }).toPass({ timeout: 15_000 });

        const palette = page.getByRole('dialog', { name: /Command Palette/i });
        await expect(palette.getByText('Actions', { exact: true })).toBeVisible();
        await expect(palette.getByRole('option', { name: /Switch to (dark|system) theme/i })).toBeVisible();

        // Reviews is the current section (excluded); Products was visited before it, so it shows under Recent.
        await expect(palette.getByText('Recent', { exact: true })).toBeVisible();
        await expect(palette.getByRole('option', { name: /Products/i }).first()).toBeVisible();
    });
});
