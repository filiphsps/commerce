import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartForm } from '../src/cart-form';

describe('<CartForm>', () => {
    it('renders a native <form action={fn}> with hidden inputs', () => {
        const action = vi.fn();
        render(
            <CartForm action="add-line" variantId="v" quantity={1} formAction={action}>
                <button type="submit">Add</button>
            </CartForm>,
        );
        const form = screen.getByRole('button', { name: 'Add' }).closest('form');
        expect(form).toBeTruthy();
        if (!form) throw new Error('form not found');
        const inputs = form.querySelectorAll('input[type="hidden"]');
        const names = Array.from(inputs).map((i) => i.getAttribute('name'));
        expect(names).toContain('variantId');
        expect(names).toContain('quantity');
        expect(names).toContain('kind');
    });
});
