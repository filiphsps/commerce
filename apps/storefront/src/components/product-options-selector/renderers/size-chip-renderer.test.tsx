import { describe, expect, it } from 'vitest';
import { SizeChipRenderer } from '@/components/product-options-selector/renderers/size-chip-renderer';
import { render, screen } from '@/utils/test/react';

const baseProps = {
    name: 'Size',
    value: '200g',
    selected: false,
    available: true,
    exists: true,
    isDifferentProduct: false,
    onSelect: () => {},
};

describe('components', () => {
    describe('SizeChipRenderer', () => {
        it('shows localized weight as a secondary line in spacious density', () => {
            const variant = { id: 'v', weight: 200, weightUnit: 'GRAMS' } as any;
            render(<SizeChipRenderer {...baseProps} variant={variant} density="spacious" />);
            // The default test wrapper renders with Locale.default = en-US, so
            // grams localize to ounces.
            expect(screen.getByText(/oz/i)).toBeInTheDocument();
            expect(screen.getByText('200g')).toBeInTheDocument();
        });

        it('omits the weight line in compact density', () => {
            const variant = { id: 'v', weight: 200, weightUnit: 'GRAMS' } as any;
            render(<SizeChipRenderer {...baseProps} variant={variant} density="compact" />);
            expect(screen.queryByText(/oz/i)).not.toBeInTheDocument();
            expect(screen.getByText('200g')).toBeInTheDocument();
        });

        it('falls back to value text when variant.weight is missing in spacious', () => {
            const variant = { id: 'v' } as any;
            render(<SizeChipRenderer {...baseProps} variant={variant} density="spacious" />);
            expect(screen.queryByText(/oz/i)).not.toBeInTheDocument();
            expect(screen.getByText('200g')).toBeInTheDocument();
        });
    });
});
