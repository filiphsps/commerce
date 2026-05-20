// apps/docs/e2e/basepath.spec.ts
import { expect, test } from '@playwright/test';

test('internal links respect basePath', async ({ page }) => {
    await page.goto('/');
    const links = await page
        .locator('a[href^="/"]')
        .evaluateAll((els: HTMLAnchorElement[]) => els.map((a) => a.getAttribute('href') ?? ''));
    const basePath = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
    if (basePath) {
        for (const href of links) {
            // Each internal link should start with basePath (Next prepends automatically).
            if (href.startsWith('/') && !href.startsWith('//')) {
                expect(href.startsWith(basePath) || href.startsWith('/_next')).toBe(true);
            }
        }
    }
});
