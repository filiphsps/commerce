import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '@/components/shell/empty-state';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

describe('EmptyState', () => {
    it('renders the required label', () => {
        render(<EmptyState label="No pages yet" />);
        expect(screen.getByText('No pages yet')).toBeInTheDocument();
    });

    it('renders the optional description', () => {
        render(<EmptyState label="No pages yet" description="Create your first page." />);
        expect(screen.getByText('Create your first page.')).toBeInTheDocument();
    });

    it('renders an action link when actionHref and actionLabel are both provided', () => {
        render(
            <EmptyState
                label="No pages yet"
                actionLabel="New page"
                actionHref={'/abc/content/pages/new/' as Route}
            />,
        );
        const link = screen.getByRole('link', { name: 'New page' });
        expect(link).toHaveAttribute('href', '/abc/content/pages/new/');
    });

    it('does not render an action when actionHref is missing', () => {
        render(<EmptyState label="No pages yet" actionLabel="New page" />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('does not render an action when actionLabel is missing', () => {
        render(<EmptyState label="No pages yet" actionHref={'/abc/' as Route} />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
