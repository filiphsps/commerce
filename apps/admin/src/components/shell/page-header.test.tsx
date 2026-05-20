import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from '@/components/shell/page-header';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

describe('PageHeader', () => {
    it('renders the title as heading level 1', () => {
        render(<PageHeader title="Edit Article" />);
        expect(screen.getByRole('heading', { level: 1, name: 'Edit Article' })).toBeInTheDocument();
    });

    it('renders breadcrumbs with links for non-last items', () => {
        render(
            <PageHeader
                title="Hello"
                breadcrumbs={[
                    { label: 'Content', href: '/abc/content/' as import('next').Route },
                    { label: 'Articles', href: '/abc/content/articles/' as import('next').Route },
                    { label: 'Hello' },
                ]}
            />,
        );
        expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/abc/content/');
        expect(screen.getByRole('link', { name: 'Articles' })).toHaveAttribute('href', '/abc/content/articles/');
        expect(screen.queryByRole('link', { name: 'Hello' })).not.toBeInTheDocument();
    });

    it('renders an actions slot', () => {
        render(<PageHeader title="Edit" actions={<button type="button">Save</button>} />);
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('carries the data-page-header attribute', () => {
        const { container } = render(<PageHeader title="X" />);
        expect(container.querySelector('[data-page-header]')).toBeInTheDocument();
    });
});
