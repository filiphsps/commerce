import * as React from 'react';

import Component from './';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('Icon', () => {
        it('should render without throwing an error', () => {
            const component = render(<Component src={'contact'} />);
            expect(component);
        });
    });
});
