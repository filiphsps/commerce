import { describe, expect, it } from 'vitest';
import { render, screen } from '@/utils/test/react';

describe('utils/test/react', () => {
    it('renders the children inside the admin providers', () => {
        render(<div data-testid="child">hello</div>);
        expect(screen.getByTestId('child')).toHaveTextContent('hello');
    });
});
