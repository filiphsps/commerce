import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/utils/test/react';

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));
const { searchParams } = vi.hoisted(() => ({ searchParams: { value: new URLSearchParams() } }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
    usePathname: () => '/acme.test/settings/theme',
    useSearchParams: () => searchParams.value,
}));
vi.mock('@nordcom/commerce-db/lib/theme-catalog', () => ({
    deriveCatalog: () =>
        new Map([
            ['colors', new Map([['brand', [{ path: 'theme.colors.brand', cluster: 'brand' }]]])],
            ['typography', new Map([['fonts', [{ path: 'theme.typography.fonts', cluster: 'fonts' }]]])],
        ]),
}));
vi.mock('./token-control', () => ({ TokenControl: () => null }));
vi.mock('./accent-repeater', () => ({ AccentRepeater: () => null }));
vi.mock('./control-registry', () => ({ isAccentRepeaterToken: () => false }));

import { ThemeEditor } from './theme-editor';

describe('<ThemeEditor> tablist', () => {
    beforeEach(() => {
        mockReplace.mockClear();
        searchParams.value = new URLSearchParams();
    });

    it('renders one tab per section with roving tabindex on the active tab', () => {
        render(<ThemeEditor />);
        const tabs = screen.getAllByRole('tab');
        expect(tabs.map((tab) => tab.textContent)).toEqual(['Colors', 'Typography']);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[0]).toHaveAttribute('tabindex', '0');
        expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
        expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });

    it('labels the panel with the active tab', () => {
        render(<ThemeEditor />);
        const panel = screen.getByRole('tabpanel');
        expect(panel).toHaveAttribute('aria-labelledby', screen.getAllByRole('tab')[0]?.id);
    });

    it('selects the active section from ?group=', () => {
        searchParams.value = new URLSearchParams('group=typography');
        render(<ThemeEditor />);
        const tabs = screen.getAllByRole('tab');
        expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('moves selection with the ArrowRight key', () => {
        render(<ThemeEditor />);
        fireEvent.keyDown(screen.getAllByRole('tab')[0]!, { key: 'ArrowRight' });
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('group=typography'), expect.anything());
    });

    it('wraps from the last tab back to the first with ArrowRight', () => {
        searchParams.value = new URLSearchParams('group=typography');
        render(<ThemeEditor />);
        fireEvent.keyDown(screen.getAllByRole('tab')[1]!, { key: 'ArrowRight' });
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('group=colors'), expect.anything());
    });
});
