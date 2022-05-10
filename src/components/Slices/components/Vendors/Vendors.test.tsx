import * as React from 'react';

import Component from './';
import ProviderWrapper from '../../../../../testComponents/ProviderWrapper';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('Vendors', () => {
        it('should render without throwing an error', () => {
            const component = render(
                <ProviderWrapper>
                    <Component />
                </ProviderWrapper>
            );
            expect(component);
        });
    });
});
