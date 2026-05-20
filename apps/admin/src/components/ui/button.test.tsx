import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import { render, screen } from '@/utils/test/react';

describe('Button', () => {
    it('renders a button with text', () => {
        render(<Button>Save</Button>);
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('applies variant classes', () => {
        render(<Button variant="destructive">Delete</Button>);
        const btn = screen.getByRole('button', { name: 'Delete' });
        expect(btn.className).toMatch(/bg-destructive/);
    });

    it('renders as a child via asChild', () => {
        render(
            <Button asChild>
                <a href="/foo">Link</a>
            </Button>,
        );
        const link = screen.getByRole('link', { name: 'Link' });
        expect(link.tagName).toBe('A');
        expect(link.className).toMatch(/inline-flex/);
    });
});
