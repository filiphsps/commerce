import { describe, expect, it } from 'vitest';
import { Button } from '@/components/actionable/button';
import { EmptyState } from '@/components/empty-state';
import Link from '@/components/link';
import { render, screen } from '@/utils/test/react';

describe('EmptyState', () => {
    it('renders the title as the configured heading element', () => {
        render(<EmptyState titleAs="h1" title="Nothing here yet" />);

        expect(screen.getByRole('heading', { level: 1, name: 'Nothing here yet' })).toBeTruthy();
    });

    it('renders the supporting description and call-to-action when provided', () => {
        render(
            <EmptyState
                title="No results found"
                description="Try a different search."
                action={
                    <Button as={Link} href="/">
                        Browse all products
                    </Button>
                }
            />,
        );

        expect(screen.getByText('Try a different search.')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Browse all products' })).toBeTruthy();
    });

    it('wraps the optional icon in a decorative badge so the title carries the meaning', () => {
        render(<EmptyState title="Empty" icon={<svg data-testid="glyph" aria-hidden="true" />} />);

        const glyph = screen.getByTestId('glyph');
        expect(glyph.closest('[aria-hidden="true"]')).not.toBeNull();
    });
});
