import { describe, expect, it } from 'vitest';
import { render } from '@/utils/test/react';
import VariantImage from './variant-image';

const product = (overrides: any = {}) =>
    ({
        title: 'Hoodie',
        vendor: 'M',
        handle: 'h',
        featuredImage: { url: 'https://cdn/feat.jpg', altText: 'feat', width: 800, height: 1000 },
        images: { edges: [{ node: { id: 'i1', url: 'https://cdn/i1.jpg', altText: 'i1', width: 800, height: 1000 } }] },
        ...overrides,
    }) as any;

describe('VariantImage (server)', () => {
    it('renders an img with the seed variant image URL when present', () => {
        const v = { image: { url: 'https://cdn/v1.jpg', altText: 'v1', width: 800, height: 1000 } } as any;
        const { container } = render(
            <VariantImage product={product()} seedVariant={v} priority={false} aspect="vertical" />,
        );
        const img = container.querySelector('img');
        expect(img?.getAttribute('src')).toContain('v1.jpg');
    });

    it('falls back to featuredImage when seed variant has no image', () => {
        const { container } = render(
            <VariantImage product={product()} seedVariant={{} as any} priority={false} aspect="vertical" />,
        );
        const img = container.querySelector('img');
        expect(img?.getAttribute('src')).toContain('feat.jpg');
    });

    it('renders a placeholder when no images exist', () => {
        const p = product({ featuredImage: undefined, images: { edges: [] } });
        const { container } = render(
            <VariantImage product={p} seedVariant={{} as any} priority={false} aspect="vertical" />,
        );
        expect(container.querySelector('[data-testid="product-card-image-placeholder"]')).toBeTruthy();
    });
});
