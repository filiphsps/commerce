import { describe, expect, it } from 'vitest';
import { Skeleton } from '@/components/shell/skeleton';
import { render } from '@/utils/test/react';

describe('Skeleton', () => {
    it('renders an element with the animate-pulse class', () => {
        const { container } = render(<Skeleton />);
        const el = container.querySelector('div');
        expect(el).not.toBeNull();
        expect(el!.className).toContain('animate-pulse');
    });

    it('passes through className overrides', () => {
        const { container } = render(<Skeleton className="h-10 w-full" />);
        const el = container.querySelector('div');
        expect(el!.className).toContain('h-10');
        expect(el!.className).toContain('w-full');
    });

    it('is hidden from assistive tech via aria-hidden', () => {
        const { container } = render(<Skeleton />);
        expect(container.querySelector('[aria-hidden]')).not.toBeNull();
    });
});
