import { describe, expect, it, vi } from 'vitest';
// Use the per-render `container` rather than the project's `screen` helper —
// `screen` in @/utils/test/react captures document.body at import time, which
// goes stale across happy-dom test contexts.
import { render } from '@/utils/test/react';
import InlinePicker from './inline';

const product = {
    handle: 'tee',
    options: [{ name: 'Size', values: ['S'], optionValues: [{ name: 'S' }] }],
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

describe('InlinePicker', () => {
    it('renders nothing when closed', () => {
        const { container } = render(
            <InlinePicker
                product={product as never}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={false}
                onOpenChange={vi.fn()}
            />,
        );
        expect(container.querySelector('[role="group"]')).toBeNull();
    });

    it('expands in place when open', () => {
        const { container } = render(
            <InlinePicker
                product={product as never}
                locale={{ code: 'en-US' } as never}
                i18n={{} as never}
                open={true}
                onOpenChange={vi.fn()}
            />,
        );
        const group = container.querySelector('[role="group"]') as HTMLElement;
        expect(group).toBeTruthy();
        expect(group.getAttribute('aria-label')).toBe('Product options');
    });
});
