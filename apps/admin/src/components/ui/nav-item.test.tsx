import { describe, expect, it, vi } from 'vitest';
import { NavItem } from '@/components/ui/nav-item';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/abc/content/articles/',
}));

describe('NavItem', () => {
    it('renders as a link with the given href', () => {
        render(<NavItem href="/abc/content/">Content</NavItem>);
        expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/abc/content/');
    });

    it('applies active styling when pathname starts with href', () => {
        render(<NavItem href="/abc/content/">Content</NavItem>);
        const link = screen.getByRole('link', { name: 'Content' });
        expect(link.className).toMatch(/uppercase/);
    });

    it('renders as a span and applies disabled styling when disabled', () => {
        render(
            <NavItem href="/abc/settings/users/" disabled>
                Users
            </NavItem>,
        );
        const el = screen.getByText('Users');
        expect(el.tagName).toBe('SPAN');
        expect(el).toHaveAttribute('aria-disabled', 'true');
    });
});
