import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { productMultiOption } from '@/components/product-card/__fixtures__';
import { ProductCardContextProvider } from '@/components/product-card/context';
import ProductCardOptions from '@/components/product-card/primitives/product-card-options';
import { render, screen } from '@/utils/test/react';

const ctx = (overrides: any = {}) => {
    const product = productMultiOption();
    return {
        variant: 'vertical-boxed' as const,
        data: product,
        selected: undefined,
        setSelected: vi.fn(),
        hoveredImage: undefined,
        setHoveredImage: vi.fn(),
        i18n: {} as any,
        locale: { code: 'en-US' } as any,
        priority: false,
        ...overrides,
    };
};

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardOptions', () => {
                it('renders nothing for micro variant', () => {
                    const { container } = render(
                        <ProductCardContextProvider value={ctx({ variant: 'micro' as const })}>
                            <ProductCardOptions />
                        </ProductCardContextProvider>,
                    );
                    expect(container).toBeEmptyDOMElement();
                });

                it('renders a +N pill when total > inlineLimit', () => {
                    render(
                        <ProductCardContextProvider value={ctx()}>
                            <ProductCardOptions />
                        </ProductCardContextProvider>,
                    );
                    // multi-option fixture has 8 Color values; vertical-boxed desktop inline = 4 → +5
                    expect(screen.getByRole('button', { name: /show all color/i })).toHaveTextContent('+5');
                });

                it('opens the overlay when +N is clicked', () => {
                    render(
                        <ProductCardContextProvider value={ctx()}>
                            <ProductCardOptions />
                        </ProductCardContextProvider>,
                    );
                    fireEvent.click(screen.getByRole('button', { name: /show all color/i }));
                    expect(screen.getByRole('dialog', { name: /color/i })).toBeInTheDocument();
                });
            });
        });
    });
});
