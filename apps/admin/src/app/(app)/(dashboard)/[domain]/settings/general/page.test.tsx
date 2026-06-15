import { describe, expect, it, vi } from 'vitest';

const { mockRedirect } = vi.hoisted(() => ({
    mockRedirect: vi.fn((url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));

import GeneralSettingsPage from './page';

describe('GeneralSettingsPage', () => {
    // Regression: the settings overview "General" card and the settings subnav both linked to
    // `…/settings/general/`, which had no route and 404'd. General shop configuration lives in the
    // shop editor, so this alias forwards there.
    it('redirects to the shop editor', async () => {
        await expect(GeneralSettingsPage({ params: Promise.resolve({ domain: 'acme.test' }) })).rejects.toThrow(
            'NEXT_REDIRECT:/acme.test/settings/shop/',
        );
        expect(mockRedirect).toHaveBeenCalledWith('/acme.test/settings/shop/');
    });
});
