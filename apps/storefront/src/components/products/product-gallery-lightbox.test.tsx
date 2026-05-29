import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import { describe, expect, it, vi } from 'vitest';

import { ProductGalleryLightbox } from '@/components/products/product-gallery-lightbox';
import dictionary from '@/i18n/en.json';
import { fireEvent, render, screen } from '@/utils/test/react';

const image = {
    id: 'img-1',
    url: 'https://cdn.example/1.webp',
    altText: 'Front view',
    width: 1200,
    height: 900,
} as unknown as ShopifyImage;

describe('components/products/product-gallery-lightbox', () => {
    it('opens the native dialog modally when open is true and uses the image alt as its name', () => {
        const { container } = render(
            <ProductGalleryLightbox image={image} open={true} onClose={vi.fn()} i18n={dictionary} />,
        );
        const dialog = container.querySelector('dialog');

        expect(dialog?.open).toBe(true);
        expect(dialog?.getAttribute('aria-label')).toBe('Front view');
    });

    it('closes the dialog imperatively when open flips to false', () => {
        const { container, rerender } = render(
            <ProductGalleryLightbox image={image} open={true} onClose={vi.fn()} i18n={dictionary} />,
        );
        const dialog = container.querySelector('dialog');
        expect(dialog?.open).toBe(true);

        rerender(<ProductGalleryLightbox image={image} open={false} onClose={vi.fn()} i18n={dictionary} />);
        expect(dialog?.open).toBe(false);
    });

    it('toggles the magnified view and its accessible label on click', () => {
        render(<ProductGalleryLightbox image={image} open={true} onClose={vi.fn()} i18n={dictionary} />);

        const zoom = screen.getByRole('button', { name: 'Zoom in' });
        const picture = screen.getByAltText('Front view');
        expect(picture.className).not.toContain('scale-150');

        fireEvent.click(zoom);

        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
        expect(screen.getByAltText('Front view').className).toContain('scale-150');
    });

    it('invokes onClose from the close control', () => {
        const onClose = vi.fn();
        render(<ProductGalleryLightbox image={image} open={true} onClose={onClose} i18n={dictionary} />);

        fireEvent.click(screen.getByRole('button', { name: 'close' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
