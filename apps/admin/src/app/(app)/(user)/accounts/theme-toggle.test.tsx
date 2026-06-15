import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { saveThemePreference, toastError } = vi.hoisted(() => ({
    saveThemePreference: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('./actions', () => ({ saveThemePreference }));
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

import { ThemeProvider } from '@/components/theme/theme-provider';

import { ThemeToggle } from './theme-toggle';

function renderToggle(initialTheme: 'dark' | 'system') {
    return render(
        <ThemeProvider initialPreference={initialTheme}>
            <ThemeToggle initialTheme={initialTheme} />
        </ThemeProvider>,
    );
}

describe('ThemeToggle', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });

    it('marks the active option and persists a new choice', async () => {
        saveThemePreference.mockResolvedValue({ ok: true });
        const { getByRole } = renderToggle('system');
        const dark = getByRole('radio', { name: 'Dark' });
        await act(async () => {
            dark.click();
        });
        expect(dark.getAttribute('aria-checked')).toBe('true');
        expect(saveThemePreference).toHaveBeenCalledWith('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('reverts and toasts on a failed save', async () => {
        saveThemePreference.mockResolvedValue({ ok: false, error: 'boom' });
        const { getByRole } = renderToggle('system');
        await act(async () => {
            getByRole('radio', { name: 'Dark' }).click();
        });
        expect(toastError).toHaveBeenCalled();
        expect(getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
    });
});
