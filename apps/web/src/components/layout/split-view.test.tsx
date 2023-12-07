import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SplitView from '@/components/layout/split-view';

describe('SplitView', () => {
    it('renders aside and primary content', async () => {
        const asideContent = 'This is the aside content';
        const primaryContent = 'This is the primary content';

        const { getByText } = render(
            <SplitView aside={<div>{asideContent}</div>}>
                <div>{primaryContent}</div>
            </SplitView>
        );

        expect(getByText(asideContent)).toBeDefined();
        expect(getByText(primaryContent)).toBeDefined();
    });
});
