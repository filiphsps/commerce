import { describe, expect, it } from 'vitest';

import { Page } from '@/components/layout/page';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Page', () => {
        it('should render', () => {
            const wrapper = render(<Page>Hello world!</Page>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
