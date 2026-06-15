import { describe, expect, it, vi } from 'vitest';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/abc/',
}));

const ITEMS: CommandPaletteItem[] = [
    { id: 'home', label: 'Home', href: '/abc/' as never, group: 'Navigate' },
    { id: 'settings', label: 'Settings', href: '/abc/settings' as never, group: 'Navigate' },
];

function renderPalette(items: CommandPaletteItem[] = ITEMS) {
    return render(
        <ThemeProvider initialPreference="dark">
            <CommandPalette items={items} />
        </ThemeProvider>,
    );
}

describe('CommandPalette', () => {
    it('does not render content when closed', () => {
        renderPalette();
        expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
    });

    it('opens via Cmd+K', () => {
        renderPalette();
        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
    });

    it('surfaces an Actions theme toggle and the Navigate group when open', () => {
        renderPalette();
        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByText('Actions')).toBeInTheDocument();
        expect(screen.getByText(/Switch to system theme/i)).toBeInTheDocument();
        expect(screen.getByText('Navigate')).toBeInTheDocument();
    });
});
