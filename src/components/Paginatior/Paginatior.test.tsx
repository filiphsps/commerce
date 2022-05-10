import * as React from 'react';

import Component from './';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('Paginatior', () => {
        it('should render without throwing an error', () => {
            const component = render(<Component step={0} size={100} />);
            expect(component);
        });
    });
});
