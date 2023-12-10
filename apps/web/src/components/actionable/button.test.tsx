import { describe, expect, it } from 'vitest';

import { Button } from '@/components/actionable/button';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('Button', () => {
        it('should render', () => {
            const wrapper = render(<Button>Hello Button</Button>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
