import { Label } from '@/components/typography/label';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('components', () => {
    describe('Label', () => {
        it('should render', () => {
            const wrapper = render(<Label>Nordcom Commerce</Label>);

            expect(() => wrapper.unmount()).not.toThrow();
        });
    });
});
