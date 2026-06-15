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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(<NavItem href={'/abc/content/' as any}>Content</NavItem>);
        expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/abc/content/');
    });

    it('applies active styling and aria-current when the pathname is under the href', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render(<NavItem href={'/abc/content/' as any}>Content</NavItem>);
        const link = screen.getByRole('link', { name: 'Content' });
        expect(link.className).toMatch(/bg-muted/);
        expect(link).toHaveAttribute('aria-current', 'page');
        expect(link).toHaveAttribute('data-active', 'true');
    });

    it('honors the controlled active prop over the pathname heuristic', () => {
        render(
            // The pathname is under this href, but active={false} forces it inactive — this is how the
            // rail enforces a single active sibling.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <NavItem href={'/abc/content/' as any} active={false}>
                Content
            </NavItem>,
        );
        const link = screen.getByRole('link', { name: 'Content' });
        expect(link).not.toHaveAttribute('aria-current');
    });

    it('renders as a span and applies disabled styling when disabled', () => {
        render(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <NavItem href={'/abc/settings/users/' as any} disabled>
                Users
            </NavItem>,
        );
        const el = screen.getByText('Users');
        expect(el.tagName).toBe('SPAN');
        expect(el).toHaveAttribute('aria-disabled', 'true');
    });
});
