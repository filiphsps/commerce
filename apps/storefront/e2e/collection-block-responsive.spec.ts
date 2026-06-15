import { expect, test } from '@playwright/test';

/** Breakpoint min widths (CSS px), mirroring `@nordcom/commerce-cms/responsive`. */
const BREAKPOINTS: Array<[string, number]> = [
    ['base', 0],
    ['sm', 640],
    ['md', 768],
    ['lg', 1024],
    ['xl', 1280],
    ['2xl', 1536],
];

/**
 * Resolve a `data-layout` summary (e.g. `base:carousel md:grid`) at a viewport
 * width, cascading from the nearest defined breakpoint at or below it.
 *
 * @param summary - The section's `data-layout` attribute.
 * @param width - The viewport width in CSS px.
 * @returns `'grid'` or `'carousel'`.
 */
function resolveLayout(summary: string, width: number): string {
    const map = new Map(summary.split(/\s+/).map((entry) => entry.split(':') as [string, string]));
    let value = map.get('base') ?? 'grid';
    for (const [breakpoint, min] of BREAKPOINTS) {
        if (width >= min && map.has(breakpoint)) value = map.get(breakpoint)!;
    }
    return value;
}

test.describe('Collection block responsive layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/favicon.png', (route) => route.fulfill({ status: 200, body: '' }));
        await page.route('**/api/media/file/**', (route) => route.fulfill({ status: 200, body: '' }));
    });

    test('renders the grid/carousel the data declares at mobile and desktop widths', async ({ page }) => {
        const response = await page.goto('/en-US/');
        if (!response || response.status() >= 400) test.skip(true, 'Storefront home unavailable');

        const section = page.locator("[data-block-type='collection']").first();
        if (!(await section.isVisible({ timeout: 10_000 }).catch(() => false))) {
            test.skip(true, 'No collection block on the seeded home page');
        }

        const rail = section.locator('[data-rail]').first();
        if ((await rail.count()) === 0) test.skip(true, 'Collection block has no responsive rail');

        const summary = (await section.getAttribute('data-layout')) ?? '';
        expect(summary).not.toBe('');

        /** The rail's used `grid-auto-flow` (`column` = carousel, `row` = grid). */
        const flow = () => rail.evaluate((node) => getComputedStyle(node).gridAutoFlow);
        const expectFlow = (mode: string) => (mode === 'carousel' ? 'column' : 'row');

        await page.setViewportSize({ width: 375, height: 812 });
        // The original bug: a vertical single-column list on phones. The default
        // resolves to a carousel here, so the rail must flow horizontally.
        expect(await flow()).toBe(expectFlow(resolveLayout(summary, 375)));

        await page.setViewportSize({ width: 1280, height: 900 });
        expect(await flow()).toBe(expectFlow(resolveLayout(summary, 1280)));
    });
});
