import { describe, expect, it, vi } from 'vitest';
import { MobileDrawer } from '@/components/shell/mobile-drawer';
import { render, screen } from '@/utils/test/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/abc/' }));

describe('MobileDrawer', () => {
    it('renders trigger and content', () => {
        render(
            <MobileDrawer side="left" trigger={<button type="button">Menu</button>}>
                <p>drawer body</p>
            </MobileDrawer>,
        );
        expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });
});
