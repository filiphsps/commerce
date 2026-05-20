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
    it('renders nav links for the given items', () => {
        render(
            <IconRail
                items={[
                    { href: '/abc/' as never, label: 'Home', icon: <span data-testid="i-home" /> },
                    { href: '/abc/products/' as never, label: 'Products', icon: <span data-testid="i-prod" /> },
                ]}
                expanded={false}
            />,
        );
        expect(screen.getByRole('link', { name: /Home/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Products/ })).toBeInTheDocument();
    });
});
