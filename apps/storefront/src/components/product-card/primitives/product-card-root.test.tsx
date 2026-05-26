import { describe, expect, it } from 'vitest';
import { productSimple } from '@/components/product-card/__fixtures__';
import ProductCardRoot from '@/components/product-card/primitives/product-card-root';
import { render, screen } from '@/utils/test/react';

describe('components', () => {
    describe('product-card', () => {
        describe('primitives', () => {
            describe('ProductCardRoot', () => {
                it('renders children inside a tokenized chrome container with data-variant', () => {
                    const product = productSimple();
                    render(
                        <ProductCardRoot data={product} variant="vertical-boxed">
                            <div data-testid="child">hi</div>
                        </ProductCardRoot>,
                    );
                    const root = screen.getByTestId('product-card-root');
                    expect(root.getAttribute('data-variant')).toBe('vertical-boxed');
                    expect(root.tagName).toBe('ARTICLE');
                    expect(root.getAttribute('data-layout')).toBe('vertical');
                    expect(root.getAttribute('data-chrome')).toBe('boxed');
                    expect(screen.getByTestId('child')).toBeInTheDocument();
                });

                it('exposes layout + chrome data attributes for horizontal-bare', () => {
                    const product = productSimple();
                    render(
                        <ProductCardRoot data={product} variant="horizontal-bare">
                            <div />
                        </ProductCardRoot>,
                    );
                    const root = screen.getByTestId('product-card-root');
                    expect(root.getAttribute('data-variant')).toBe('horizontal-bare');
                    expect(root.getAttribute('data-layout')).toBe('horizontal');
                    expect(root.getAttribute('data-chrome')).toBe('bare');
                });

                it('exposes layout=micro for micro variant', () => {
                    const product = productSimple();
                    render(
                        <ProductCardRoot data={product} variant="micro">
                            <div />
                        </ProductCardRoot>,
                    );
                    const root = screen.getByTestId('product-card-root');
                    expect(root.getAttribute('data-layout')).toBe('micro');
                });
            });
        });
    });
});
