import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider, useTheme } from './theme-provider';

function Probe() {
    const { preference, setPreference } = useTheme();
    return (
        <button type="button" data-pref={preference} onClick={() => setPreference('dark')}>
            toggle
        </button>
    );
}

describe('ThemeProvider', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });
    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });

    it('applies the initial preference to <html data-theme> on mount', () => {
        render(
            <ThemeProvider initialPreference="dark">
                <Probe />
            </ThemeProvider>,
        );
        expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('updates data-theme and writes the cookie when the preference changes', () => {
        // Capture cookie writes via an own accessor — the test DOM's cookie jar does not persist
        // writes, so spy on the write itself rather than reading it back.
        let written = '';
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            get: () => written,
            set: (value: string) => {
                written = value;
            },
        });

        const { getByRole } = render(
            <ThemeProvider initialPreference="system">
                <Probe />
            </ThemeProvider>,
        );
        act(() => {
            getByRole('button').click();
        });
        expect(getByRole('button').getAttribute('data-pref')).toBe('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(written).toContain('admin-theme=dark');

        Reflect.deleteProperty(document, 'cookie');
    });
});
