import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductCardRoot from './product-card-root';

// Loose-shape product fixture; cast at the component boundary so the test body
// can spread/mutate without TypeScript narrowing it to `never`.
const product = {
    handle: 'tee',
    availableForSale: true,
    variants: { edges: [{ node: { id: 'v1', availableForSale: true, selectedOptions: [{ name: 'Size', value: 'M' }] } }] },
};

describe('ProductCardRoot', () => {
    it('renders vertical-boxed chassis by default', () => {
        const { container } = render(
            <ProductCardRoot data={product as never} layout="vertical" chrome="boxed">
                <div data-testid="content" />
            </ProductCardRoot>,
        );
        const article = container.querySelector('article') as HTMLElement;
        expect(article).toBeTruthy();
        expect(article.dataset.layout).toBe('vertical');
        expect(article.dataset.chrome).toBe('boxed');
        expect(article.dataset.availability).toBeUndefined();
    });

    it('marks data-availability="out-of-stock" when product has no buyable variants', () => {
        const oos = { ...product, availableForSale: false };
        const { container } = render(
            <ProductCardRoot data={oos as never} layout="vertical" chrome="boxed">
                <div />
            </ProductCardRoot>,
        );
        const article = container.querySelector('article') as HTMLElement;
        expect(article.dataset.availability).toBe('out-of-stock');
    });

    it('horizontal layout sets data-layout', () => {
        const { container } = render(
            <ProductCardRoot data={product as never} layout="horizontal" chrome="boxed">
                <div />
            </ProductCardRoot>,
        );
        const article = container.querySelector('article') as HTMLElement;
        expect(article.dataset.layout).toBe('horizontal');
    });
});
