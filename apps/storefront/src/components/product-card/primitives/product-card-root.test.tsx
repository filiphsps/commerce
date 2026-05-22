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
                        <ProductCardRoot
                            data={product}
                            variant="vertical-boxed"
                            i18n={{} as any}
                            locale={{ code: 'en-US' } as any}
                            initialVariant={undefined}
                            priority={false}
                        >
                            <div data-testid="child">hi</div>
                        </ProductCardRoot>,
                    );
                    const root = screen.getByTestId('product-card-root');
                    expect(root.getAttribute('data-variant')).toBe('vertical-boxed');
                    expect(screen.getByTestId('child')).toBeInTheDocument();
                });

                it('falls back to vertical-boxed on unknown variant', () => {
                    const product = productSimple();
                    render(
                        <ProductCardRoot
                            data={product}
                            variant={'banana' as any}
                            i18n={{} as any}
                            locale={{ code: 'en-US' } as any}
                            initialVariant={undefined}
                            priority={false}
                        >
                            <div />
                        </ProductCardRoot>,
                    );
                    expect(screen.getByTestId('product-card-root').getAttribute('data-variant')).toBe('vertical-boxed');
                });
            });
        });
    });
});
