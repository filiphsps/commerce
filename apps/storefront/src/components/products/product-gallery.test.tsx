import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import { describe, expect, it, vi } from 'vitest';
import type { ProductGalleryProps } from '@/components/products/product-gallery';
import { ProductGallery } from '@/components/products/product-gallery';
import dictionary from '@/i18n/en.json';
import { fireEvent, render, screen } from '@/utils/test/react';

const images = [
    { id: 'img-1', url: 'https://cdn.example/1.webp', altText: 'Front view', width: 800, height: 600 },
    { id: 'img-2', url: 'https://cdn.example/2.webp', altText: 'Back view', width: 800, height: 600 },
    { id: 'img-3', url: 'https://cdn.example/3.webp', altText: null, width: 800, height: 600 },
] as unknown as ShopifyImage[];

const defaultProps: ProductGalleryProps = {
    images,
    i18n: dictionary,
    product: { seo: { title: 'Product' }, vendor: 'Vendor', title: 'Title' } as never,
    pageUrl: 'https://shop.example/en-US/products/handle/',
    enableShare: false,
};

describe('components/products/product-gallery', () => {
    it('renders nothing when there are no images', () => {
        const { container } = render(<ProductGallery {...defaultProps} images={[]} />);

        expect(container.querySelector('section')).toBeNull();
    });

    it('drives the primary container surface and border from semantic tokens', () => {
        render(<ProductGallery {...defaultProps} />);

        const container = screen.getByRole('button', { name: 'Zoom image' }).parentElement;
        const className = container?.className ?? '';

        expect(className).toContain('bg-(--surface-2)');
        expect(className).toContain('border-(--border-default)');
        expect(className).not.toContain('bg-white');
        expect(className).not.toContain('bg-gray-100');
        expect(className).not.toContain('border-gray-200');
    });

    it('labels the icon-only thumbnail and zoom controls via the dictionary with the focus ring', () => {
        render(<ProductGallery {...defaultProps} />);

        const zoom = screen.getByRole('button', { name: 'Zoom image' });
        const firstThumb = screen.getByRole('button', { name: 'View image 1' });

        expect(zoom.className).toContain('focus-ring');
        expect(firstThumb.className).toContain('focus-ring');
        expect(screen.getByRole('button', { name: 'View image 2' })).toBeInTheDocument();
        // Every image keeps a stable thumbnail (the active one is no longer filtered out), so a
        // three-image gallery always exposes three numbered thumbnails.
        expect(screen.getByRole('button', { name: 'View image 3' })).toBeInTheDocument();
    });

    it('keeps all thumbnails visible and marks the active one', () => {
        render(<ProductGallery {...defaultProps} />);

        // Image 1 is the initial primary; its thumbnail stays in the strip, marked current.
        expect(screen.getByRole('button', { name: 'View image 1' })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: 'View image 2' })).not.toHaveAttribute('aria-current');
    });

    it('promotes a thumbnail to the primary image and replays the CSS fade without a JS timer', () => {
        const timeout = vi.spyOn(globalThis, 'setTimeout');
        render(<ProductGallery {...defaultProps} />);

        // Thumbnails are numbered by stable position now; "View image 2" promotes the second image.
        fireEvent.click(screen.getByRole('button', { name: 'View image 2' }));

        // Scope to the primary control: the (closed) lightbox renders the same image in the DOM too.
        const primary = screen.getByRole('button', { name: 'Zoom image' });
        const promoted = primary.querySelector('img') as HTMLImageElement;
        expect(promoted.getAttribute('alt')).toBe('Back view');
        expect(promoted.getAttribute('src')).toBe('https://cdn.example/2.webp');
        expect(promoted.className).toContain('opacity-0');
        expect(promoted.className).toContain('motion-safe:transition-opacity');
        expect(promoted.className).not.toContain('transition-none');
        expect(timeout).not.toHaveBeenCalled();

        fireEvent.load(promoted);
        expect(promoted.className).toContain('opacity-100');
        expect(promoted.className).not.toContain('opacity-0');

        timeout.mockRestore();
    });

    it('opens and closes the zoom lightbox from the primary image', () => {
        const { container } = render(<ProductGallery {...defaultProps} />);
        const dialog = container.querySelector('dialog');

        expect(dialog?.open).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'Zoom image' }));
        expect(dialog?.open).toBe(true);

        const close = dialog?.querySelector('button[aria-label="close"]') as HTMLButtonElement;
        fireEvent.click(close);
        expect(dialog?.open).toBe(false);
    });
});
