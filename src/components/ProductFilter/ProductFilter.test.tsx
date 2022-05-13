import * as React from 'react';
import { render } from '@testing-library/react';
import ProviderWrapper from '../../../__tests__/ProviderWrapper';
import Component from './';

describe('Components', () => {
    describe('ProductFilter', () => {
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
