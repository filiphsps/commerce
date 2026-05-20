import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Signature } from './signature';

describe('<Signature />', () => {
    it('renders the raw TypeScript code', async () => {
        const element = await Signature({ ts: 'function foo(): string' });
        const { getByText } = render(element);
        expect(getByText(/function/)).toBeTruthy();
    });
});
