import { describe, expect, it } from 'vitest';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { render } from '@testing-library/react';

describe('components', () => {
    describe('Breadcrumbs', () => {
        it('should render', () => {
            const wrapper = render(<Breadcrumbs />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
