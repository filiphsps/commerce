import { describe, expect, it, vi } from 'vitest';

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('server-only', () => ({}));

import ThemeSettingsPage from './page';

describe('ThemeSettingsPage (legacy redirect)', () => {
    it('redirects to the Customization hub Theme tab, preserving the locale', async () => {
        mockRedirect.mockClear();
        await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({ locale: 'de-DE' }),
        });
        expect(mockRedirect).toHaveBeenCalledWith('/acme.test/settings/customization/?tab=theme&locale=de-DE');
    });

    it('redirects without a locale query when none is provided', async () => {
        mockRedirect.mockClear();
        await ThemeSettingsPage({
            params: Promise.resolve({ domain: 'acme.test' }),
            searchParams: Promise.resolve({}),
        });
        expect(mockRedirect).toHaveBeenCalledWith('/acme.test/settings/customization/?tab=theme');
    });

    it('exposes the page title via metadata', async () => {
        const { metadata } = await import('./page');
        expect(metadata.title).toBe('Theme');
    });
});
