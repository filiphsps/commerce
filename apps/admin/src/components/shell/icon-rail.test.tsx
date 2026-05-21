import { describe, expect, it, vi } from 'vitest';
import { IconRail } from '@/components/shell/icon-rail';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/abc/' }));

describe('IconRail', () => {
    const ITEMS = [
        { href: '/abc/' as never, label: 'Home', icon: <span data-testid="i-home" /> },
        { href: '/abc/products/' as never, label: 'Products', icon: <span data-testid="i-prod" /> },
    ];

    it('renders nav links for the given items', () => {
        render(<IconRail items={ITEMS} expanded={false} />);
        expect(screen.getByRole('link', { name: /Home/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Products/ })).toBeInTheDocument();
    });

    it('hides text labels when expanded=false (icon-only mode)', () => {
        // Width-driven expansion lives in <ShellRoot>; here we exercise the
        // `expanded` prop contract directly. Label is set as aria-label on the
        // link and not rendered as visible text.
        render(<IconRail items={ITEMS} expanded={false} />);
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
        expect(screen.queryByText('Products')).not.toBeInTheDocument();
    });

    it('shows text labels when expanded=true', () => {
        render(<IconRail items={ITEMS} expanded={true} />);
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Products')).toBeInTheDocument();
    });
});
