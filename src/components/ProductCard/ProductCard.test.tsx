import * as React from 'react';

import Component from './';
import ProviderWrapper from '../../../testComponents/ProviderWrapper';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('ProductCard', () => {
        it('should render without throwing an error', () => {
            const component = render(
                <ProviderWrapper>
                    <Component handle={'test-product-1'} />
                </ProviderWrapper>
            );
            expect(component);
        });
    });
});
