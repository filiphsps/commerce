import type { IconOverrides } from './scripts/types';

// Temporary seed for Task 15's PaymentIcon test (overwritten by Task 17's full seed).
export const overrides: IconOverrides = {
    visa: { componentName: 'Visa', title: 'Visa', aliases: ['v'] },
    mastercard: { componentName: 'Mastercard', title: 'Mastercard' },
};
