import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/shell/command-palette';
import { fireEvent, render, screen } from '@/utils/test/react';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

describe('CommandPalette', () => {
    it('does not render content when closed', () => {
        render(<CommandPalette items={[{ id: 'home', label: 'Home', href: '/abc/' as never, group: 'Shop' }]} />);
        expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
    });

    it('opens via Cmd+K', () => {
        render(<CommandPalette items={[{ id: 'home', label: 'Home', href: '/abc/' as never, group: 'Shop' }]} />);
        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
    });
});
