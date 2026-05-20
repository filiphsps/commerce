import { describe, expect, it } from 'vitest';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { render } from '@/utils/test/react';

describe('ContentScrollRegion', () => {
    it('renders a data-scroll-root container with children', () => {
        const { container } = render(
            <ContentScrollRegion>
                <p>child</p>
            </ContentScrollRegion>,
        );
        const root = container.querySelector('[data-scroll-root]');
        expect(root).toBeInTheDocument();
        expect(root?.textContent).toBe('child');
    });
});
