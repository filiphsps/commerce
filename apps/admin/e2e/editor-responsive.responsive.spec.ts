import { expect, test } from '@playwright/test';

// The seeded canonical tenant (e2e/global-setup.ts). CI/staging may override.
const DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

// The Tailwind `lg` boundary at which SplitEditorLayout flips from the
// stacked Edit/Preview switch to side-by-side independent-scroll columns.
const SIDE_BY_SIDE_MIN_WIDTH = 1024;

/**
 * RESPONSIVE-01 — the redesigned document editor across the shared device
 * matrix (folded foldable → phone → tablet → desktop, one project per
 * `@nordcom/commerce-test-viewport` preset). Driven through the REAL theme
 * editor, which renders the DocumentForm → SplitEditorLayout split with a live
 * preview without needing any document to be created first.
 *
 * Proves the responsive fix from the browser, per viewport:
 *  - no page-level horizontal overflow and no column wider than the screen,
 *    down to the 280px folded-foldable floor;
 *  - below `lg`, a segmented Edit/Preview switch shows exactly one full-width
 *    pane at a time; on `lg`+ both panes show at once and the switch is gone;
 *  - the publish toolbar stays pinned and on-screen (no off-viewport footer).
 */
test('the document editor layout adapts to the viewport without overflow', async ({ page }, testInfo) => {
    const viewport = page.viewportSize();
    expect(viewport, 'a responsive project must set a viewport').not.toBeNull();
    const width = viewport?.width ?? 0;
    const isSideBySide = width >= SIDE_BY_SIDE_MIN_WIDTH;

    await page.goto(`/${DOMAIN}/settings/theme/`);

    const fieldsPane = page.getByTestId('editor-pane-fields');
    const previewPane = page.getByTestId('editor-pane-preview');
    const editToggle = page.getByTestId('editor-view-edit');
    const previewToggle = page.getByTestId('editor-view-preview');

    // The split mounts both panes regardless of viewport (the inactive one is
    // display:none on mobile), so wait on the fields pane to know the editor is up.
    await fieldsPane.waitFor({ state: 'attached', timeout: 30_000 });

    // ── No page-level horizontal scroll, at any width including 280px. ──
    const doc = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(doc.scrollWidth, `${testInfo.project.name}: page must not scroll horizontally`).toBeLessThanOrEqual(
        doc.clientWidth + 1,
    );

    if (isSideBySide) {
        // Desktop: side-by-side columns, no mobile switch.
        await expect(editToggle).toBeHidden();
        await expect(previewToggle).toBeHidden();
        await expect(fieldsPane).toBeVisible();
        await expect(previewPane).toBeVisible();
    } else {
        // Mobile / tablet / folded: one pane at a time via the switch.
        await expect(editToggle).toBeVisible();
        await expect(previewToggle).toBeVisible();
        await expect(fieldsPane).toBeVisible();
        await expect(previewPane).toBeHidden();

        // Switching shows the preview pane and hides the fields — the iframe
        // never has to share a scroll region with the field column.
        await previewToggle.click();
        await expect(previewPane).toBeVisible();
        await expect(fieldsPane).toBeHidden();

        await editToggle.click();
        await expect(fieldsPane).toBeVisible();
    }

    // ── The visible field column never exceeds the screen width. ──
    const fieldsBox = await fieldsPane.boundingBox();
    expect(fieldsBox, 'fields pane must be visible to measure').not.toBeNull();
    expect(
        fieldsBox?.width ?? Number.POSITIVE_INFINITY,
        `${testInfo.project.name}: field column must fit the viewport`,
    ).toBeLessThanOrEqual(width + 1);

    // ── The publish toolbar stays pinned and fully on-screen. ──
    const footer = page.locator('[data-page-footer]');
    await expect(footer).toBeVisible();
    const footerBox = await footer.boundingBox();
    expect(footerBox, 'footer must be measurable').not.toBeNull();
    if (footerBox && viewport) {
        expect(
            footerBox.y + footerBox.height,
            `${testInfo.project.name}: toolbar must not sit below the viewport`,
        ).toBeLessThanOrEqual(viewport.height + 1);
    }
});
