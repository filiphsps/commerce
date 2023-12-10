import { Content } from '@/components/typography/content';
import { render } from '@/utils/test/react';
import { describe, expect, it } from 'vitest';

describe('components', () => {
    describe('Content', () => {
        it('should render', () => {
            const wrapper = render(<Content />);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
