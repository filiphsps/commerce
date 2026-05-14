import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LocaleSwitcher } from '@/components/cms/locale-switcher';
import { render, screen } from '@/utils/test/react';

// ------------------------------------------------------------------
// Mock next/navigation — not available in the test environment.
// ------------------------------------------------------------------

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams('tab=general&sort=asc');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
    usePathname: () => '/test-domain/content/articles/abc/',
    useSearchParams: () => mockSearchParams,
}));

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const LOCALES = [
    { code: 'en-US', label: 'English' },
    { code: 'sv-SE', label: 'Swedish' },
    { code: 'de-DE', label: 'German' },
];

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('LocaleSwitcher', () => {
    it('renders all locale options', () => {
        render(<LocaleSwitcher locales={LOCALES} currentLocale="en-US" />);

        expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Swedish' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'German' })).toBeInTheDocument();
    });

    it('reflects the currentLocale as the selected value', () => {
        render(<LocaleSwitcher locales={LOCALES} currentLocale="sv-SE" />);

        const select = screen.getByRole('combobox');
        expect((select as HTMLSelectElement).value).toBe('sv-SE');
    });

    it('calls router.replace with updated locale param on change', () => {
        render(<LocaleSwitcher locales={LOCALES} currentLocale="en-US" />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'de-DE' } });

        expect(mockReplace).toHaveBeenCalledTimes(1);

        const [calledUrl] = mockReplace.mock.calls[0] as [string];
        const [path, qs] = calledUrl.split('?');
        const params = new URLSearchParams(qs);

        // Pathname preserved.
        expect(path).toBe('/test-domain/content/articles/abc/');
        // New locale injected.
        expect(params.get('locale')).toBe('de-DE');
    });

    it('preserves existing search params when switching locale', () => {
        render(<LocaleSwitcher locales={LOCALES} currentLocale="en-US" />);

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'sv-SE' } });

        const [, qs] = (mockReplace.mock.calls.at(-1) as [string])[0].split('?');
        const params = new URLSearchParams(qs);

        // Existing params from mockSearchParams must be preserved.
        expect(params.get('tab')).toBe('general');
        expect(params.get('sort')).toBe('asc');
        expect(params.get('locale')).toBe('sv-SE');
    });
});
