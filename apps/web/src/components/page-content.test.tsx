import { describe, expect, it } from 'vitest';

import PageContent from '@/components/page-content';
import { render } from '@testing-library/react';

describe('components', () => {
    describe('PageContent', () => {
        it('should render', () => {
            const wrapper = render(<PageContent />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
