import { describe, expect, it } from 'vitest';
import { getProductCardPicker, registerProductCardPicker } from './registry';

describe('picker registry', () => {
    it('returns the registered component', () => {
        const FakePicker = () => null;
        registerProductCardPicker('fake-test-shape', FakePicker);
        expect(getProductCardPicker('fake-test-shape')).toBe(FakePicker);
    });

    it('falls back to float when the name is unknown', () => {
        const Float = () => null;
        registerProductCardPicker('float', Float);
        expect(getProductCardPicker('absent')).toBe(Float);
    });
});
