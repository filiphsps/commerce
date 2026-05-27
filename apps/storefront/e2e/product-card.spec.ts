import { expect, test } from '@playwright/test';

const COLLECTION_URL = '/en-US/products/';
const SEARCH_URL = '/en-US/search/?q=candy';
const PRODUCT_URL = '/en-US/products/mock-shop-product-1/';

test.describe('Product card v2', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (r) => r.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (r) => r.fulfill({ status: 200, body: '' }));
    });

    test.skip('collection grid renders without getProductOptions errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error' && msg.text().includes('[h2:error:getProductOptions]')) {
                errors.push(msg.text());
            }
        });
        await page.goto(COLLECTION_URL);
        const firstCard = page.getByTestId('product-card-root').first();
        if (!(await firstCard.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available in the test storefront');
        }
        await expect(firstCard).toBeVisible();
        expect(errors).toEqual([]);
    });

    test.skip('base card carries layout + chrome data attrs', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const card = page.getByTestId('product-card-root').first();
        if (!(await card.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available');
        }
        await expect(card).toHaveAttribute('data-layout', /vertical|horizontal/);
        await expect(card).toHaveAttribute('data-chrome', /boxed|frameless/);
    });

    test.skip('base card exposes a + / quick-add CTA, not an inline size pill', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const card = page.getByTestId('product-card-root').first();
        if (!(await card.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available');
        }
        const cta = card.getByRole('button', { name: /choose options|add to bag/i });
        await expect(cta.first()).toBeVisible();
    });

    test.skip('+N overlay opens via portal outside the card', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const more = page.locator('[data-option-more]').first();
        if (!(await more.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'no overflowing option group on the collection right now');
        }
        await more.click();
        const dialog = page
            .locator('[role="dialog"][data-state="open"]')
            .or(page.locator('[data-radix-popper-content-wrapper]'));
        await expect(dialog.first()).toBeVisible({ timeout: 5_000 });
        const isPortaled = await dialog.first().evaluate((el) => {
            let node: Element | null = el;
            while (node) {
                if (node.tagName === 'ARTICLE' && node.hasAttribute('data-layout')) return false;
                node = node.parentElement;
            }
            return true;
        });
        expect(isPortaled).toBe(true);
    });

    test.skip('overlay closes on Escape', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const more = page.locator('[data-option-more]').first();
        if (!(await more.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'no overflowing option group');
        }
        await more.click();
        await expect(page.locator('[data-state="open"]').first()).toBeVisible({ timeout: 3_000 });
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-state="open"]')).toHaveCount(0, { timeout: 3_000 });
    });

    test.skip('mobile sheet closes on backdrop click', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await page.goto(COLLECTION_URL);
        const more = page.locator('[data-option-more]').first();
        if (!(await more.isVisible({ timeout: 5_000 }).catch(() => false))) {
            test.skip(true, 'no overflowing option group');
        }
        await more.click();
        await expect(page.locator('[data-state="open"]').first()).toBeVisible({ timeout: 3_000 });
        await page.mouse.click(5, 5);
        await expect(page.locator('[data-state="open"]')).toHaveCount(0, { timeout: 3_000 });
    });

    test.skip('PDP renders without uncaught errors for a known product', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(String(err)));
        const response = await page.goto(PRODUCT_URL);
        if (!response || response.status() >= 400) {
            test.skip(true, 'Known PDP fixture missing in the test storefront');
        }
        await expect(page.locator('h1, [data-display="title"]').first()).toBeVisible({ timeout: 30_000 });
        expect(pageErrors).toEqual([]);
    });

    test.skip('search row card uses horizontal layout with price + CTA', async ({ page }) => {
        await page.goto(SEARCH_URL);
        const row = page.locator('article[data-layout="horizontal"]').first();
        if (!(await row.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No matching search results in the test storefront');
        }
        await expect(row).toBeVisible();
        await expect(
            row.locator('[data-display="price"]').or(row.locator(':scope div').filter({ hasText: /\$\d/ })),
        ).toBeVisible();
        await expect(row.getByRole('button', { name: /choose options|add to bag/i }).first()).toBeVisible();
    });

    test.skip('touch targets >= 24px on all interactive elements', async ({ page }) => {
        await page.goto(COLLECTION_URL);
        const firstCard = page.locator('article[data-layout]').first();
        if (!(await firstCard.isVisible({ timeout: 30_000 }).catch(() => false))) {
            test.skip(true, 'No products available in the test storefront');
        }
        const interactives = page.locator('article[data-layout] button');
        const count = await interactives.count();
        const undersized: string[] = [];
        for (let i = 0; i < Math.min(count, 40); i++) {
            const button = interactives.nth(i);
            if (!(await button.isVisible().catch(() => false))) continue;
            const box = await button.boundingBox();
            if (box && Math.min(box.width, box.height) < 24) {
                const text = (await button.textContent())?.slice(0, 30) ?? '<no text>';
                undersized.push(`${text} (${box.width}x${box.height})`);
            }
        }
        expect(undersized).toEqual([]);
    });
});
