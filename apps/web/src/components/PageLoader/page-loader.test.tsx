import { describe, expect, it } from 'vitest';

import PageLoader from '@/components/PageLoader';
import { render } from '@testing-library/react';

describe('components', () => {
    describe('PageLoader', () => {
        it('should render', () => {
            const wrapper = render(<PageLoader />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
