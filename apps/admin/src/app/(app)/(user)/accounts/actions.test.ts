import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { updateOwnAccount, revalidatePath, cookieSet } = vi.hoisted(() => ({
    updateOwnAccount: vi.fn(),
    revalidatePath: vi.fn(),
    cookieSet: vi.fn(),
}));

vi.mock('@/lib/account-convex', () => ({ updateOwnAccount }));
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ set: cookieSet }) }));

import { saveAccountName, saveThemePreference } from './actions';

describe('saveAccountName', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.resetAllMocks());

    it('persists the trimmed name, revalidates, and returns the account', async () => {
        updateOwnAccount.mockResolvedValue({ name: 'New Name', theme: 'system' });
        const result = await saveAccountName('  New Name  ');
        expect(updateOwnAccount).toHaveBeenCalledWith({ name: 'New Name' });
        expect(revalidatePath).toHaveBeenCalledWith('/accounts/');
        expect(result).toEqual({ ok: true, account: { name: 'New Name', theme: 'system' } });
    });

    it('returns a failure result with the error message on throw', async () => {
        updateOwnAccount.mockRejectedValue(new Error('nope'));
        const result = await saveAccountName('X');
        expect(result).toEqual({ ok: false, error: 'nope' });
    });
});

describe('saveThemePreference', () => {
    beforeEach(() => vi.clearAllMocks());

    it('persists the theme, mirrors the cookie, and revalidates the layout', async () => {
        updateOwnAccount.mockResolvedValue({ name: 'N', theme: 'dark' });
        const result = await saveThemePreference('dark');
        expect(updateOwnAccount).toHaveBeenCalledWith({ theme: 'dark' });
        expect(cookieSet).toHaveBeenCalledWith('admin-theme', 'dark', expect.objectContaining({ path: '/' }));
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(result).toEqual({ ok: true });
    });
});
