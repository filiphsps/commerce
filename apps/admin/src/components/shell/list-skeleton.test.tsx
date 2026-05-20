import { describe, expect, it, vi } from 'vitest';
import { ListSkeleton } from '@/components/shell/list-skeleton';
import { render, screen } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

describe('ListSkeleton', () => {
    it('renders a page header and 5 skeleton blocks', () => {
        const { container } = render(<ListSkeleton />);
        expect(container.querySelector('[data-page-header]')).not.toBeNull();
        expect(container.querySelectorAll('[aria-hidden]').length).toBe(5);
    });

    it('uses the provided title in the page header', () => {
        render(<ListSkeleton title="Pages" />);
        expect(screen.getByRole('heading', { level: 1, name: 'Pages' })).toBeInTheDocument();
    });
});
