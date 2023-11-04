import { describe, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import SplitView from './split-view';

describe('SplitView', () => {
    it('renders aside and primary content', async () => {
        const asideContent = 'This is the aside content';
        const primaryContent = 'This is the primary content';

        render(
            <SplitView aside={<div>{asideContent}</div>}>
                <div>{primaryContent}</div>
            </SplitView>
        );

        const asideElement = await screen.findByText(asideContent);
        const primaryElement = await screen.findByText(primaryContent);

        expect(asideElement).toBeInTheDocument();
        expect(primaryElement).toBeInTheDocument();
    });
});
