import { describe, expect, it, vi } from 'vitest';
import { EditorSkeleton } from '@/components/shell/editor-skeleton';
import { render } from '@/utils/test/react';

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

describe('EditorSkeleton', () => {
    it('renders a page header and skeleton blocks', () => {
        const { container } = render(<EditorSkeleton />);
        expect(container.querySelector('[data-page-header]')).not.toBeNull();
        // 4 skeleton blocks
        expect(container.querySelectorAll('[aria-hidden]').length).toBe(4);
    });
});
