import * as React from 'react';

import Component from './';
import ProviderWrapper from '../../../testComponents/ProviderWrapper';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('Footer', () => {
        it.skip('should render without throwing an error', () => {
            const component = render(
                <ProviderWrapper>
                    <Component />
                </ProviderWrapper>
            );
            expect(component);
        });
    });
});
