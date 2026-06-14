import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/utils/test/react';
import { TextField } from './text-field';

describe('TextField', () => {
    // Regression: nordstar's Input overrides any consumer onChange (it is uncontrolled by design), which
    // silently broke the wizard's controlled state. TextField must lift every edit as a raw string.
    it('lifts each edit through onChange as a raw string', () => {
        const onChange = vi.fn();
        render(<TextField label="Shop name" value="" onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Shop name'), { target: { value: 'Acme' } });
        expect(onChange).toHaveBeenCalledWith('Acme');
    });

    it('associates the label with the input for assistive tech', () => {
        render(<TextField label="Customer-facing domain" value="shop.acme.com" onChange={() => {}} />);
        expect((screen.getByLabelText('Customer-facing domain') as HTMLInputElement).value).toBe('shop.acme.com');
    });
});
