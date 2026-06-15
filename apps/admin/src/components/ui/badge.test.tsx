import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';
import { render, screen } from '@/utils/test/react';

describe('Badge', () => {
    it('renders its label', () => {
        render(<Badge>Deprecated</Badge>);
        expect(screen.getByText('Deprecated')).toBeInTheDocument();
    });

    it('defaults to the muted variant', () => {
        render(<Badge>3 legacy</Badge>);
        expect(screen.getByText('3 legacy').className).toMatch(/bg-muted/);
    });

    it('applies the requested variant', () => {
        render(<Badge variant="destructive">Error</Badge>);
        expect(screen.getByText('Error').className).toMatch(/text-destructive/);
    });

    it('merges a passed className', () => {
        render(<Badge className="ml-2">Tag</Badge>);
        expect(screen.getByText('Tag').className).toMatch(/ml-2/);
    });
});
