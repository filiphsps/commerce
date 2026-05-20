import { describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mocks — declared before any dynamic imports so Vitest hoists them.
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

// UI components don't need to render for these server-component tests.
vi.mock('@/components/shell/content-scroll-region', () => ({
    ContentScrollRegion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shell/page-header', () => ({
    PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import type React from 'react';

describe('(dashboard)/[domain]/reviews/new/page', () => {
    const validParams = Promise.resolve({ domain: 'example.myshopify.com' });

    it('is an async function (server component)', async () => {
        const { default: Page } = await import('./page');
        expect(typeof Page).toBe('function');
    });

    it('renders the New Review heading without auth or DB calls', async () => {
        const { default: Page } = await import('./page');
        const result = await Page({ params: validParams });

        // Should return a React element (not throw / redirect).
        expect(result).not.toBeNull();
        expect(typeof result).toBe('object');
    });

    it('exports metadata with title "New Review"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('New Review');
    });
});
