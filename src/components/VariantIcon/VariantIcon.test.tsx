import * as React from 'react';

import Component from './';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('VariantIcon', () => {
        it('should render without throwing an error', () => {
            const component = render(<Component id={'roll'} />);
            expect(component);
        });
    });
});
