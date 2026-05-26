import { describe, expect, it, vi } from 'vitest';
// Use the per-render `container` rather than the project's `screen` helper —
// `screen` in @/utils/test/react captures document.body at import time, which
// goes stale across happy-dom test contexts.
import { render } from '@/utils/test/react';
import SheetPicker from './sheet';

const product = {
    handle: 'tee',
    title: 'Heavyweight Box-Cut Tee',
    options: [{ name: 'Size', values: ['S', 'M'], optionValues: [{ name: 'S' }, { name: 'M' }] }],
    variants: {
        edges: [
            {
                node: {
                    id: 'v1',
                    selectedOptions: [{ name: 'Size', value: 'S' }],
                    availableForSale: true,
                },
            },
        ],
    },
};

describe('SheetPicker', () => {
    it('renders dialog when open', () => {
        render(
            <SheetPicker
                product={product as never}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={true}
                onOpenChange={vi.fn()}
            />,
        );
        // Radix Dialog portals Content as a sibling of the test container, so
        // query off document rather than the returned container.
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();
        expect(document.body.textContent ?? '').toMatch(/heavyweight box-cut tee/i);
    });

    it('does not render dialog content when closed', () => {
        render(
            <SheetPicker
                product={product as never}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={false}
                onOpenChange={vi.fn()}
            />,
        );
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog).toBeNull();
    });
});
