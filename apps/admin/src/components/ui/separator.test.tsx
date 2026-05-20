import { describe, expect, it } from 'vitest';
import { Separator } from '@/components/ui/separator';
import { render } from '@/utils/test/react';

describe('Separator', () => {
    it('renders with separator role when not decorative', () => {
        const { container } = render(<Separator decorative={false} aria-label="section" />);
        const sep = container.querySelector('[role="separator"]');
        expect(sep).toBeInTheDocument();
    });
});
