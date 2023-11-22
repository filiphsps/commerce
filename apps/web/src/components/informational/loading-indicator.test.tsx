import { describe, expect, it } from 'vitest';

import { LoadingIndicator } from '@/components/informational/loading-indicator';
import { render } from '@testing-library/react';

describe('components', () => {
    describe('LoadingIndicator', () => {
        it('should render', () => {
            const wrapper = render(<LoadingIndicator />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
