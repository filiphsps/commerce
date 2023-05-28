import * as React from 'react';

import Component from './';
import { render } from '@testing-library/react';

describe('Components', () => {
    describe('Link', () => {
        it.skip('should render without throwing an error', () => {
            const component = render(
                <Component to={'hello-world'}>Hello Next.js</Component>
            );
            expect(component);
        });
    });
});
