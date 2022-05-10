import * as React from 'react';

import Component from './';
import ProviderWrapper from '../../../testComponents/ProviderWrapper';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('ProductModal', () => {
        it('should render without throwing an error', () => {
            const component = render(
                <ProviderWrapper>
                    <Component data={null} close={null} variant={0} />
                </ProviderWrapper>
            );
            expect(component);
        });
    });
});
