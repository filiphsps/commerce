'use client';

import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { HTMLProps, ReactNode } from 'react';
import { useCallback, useState } from 'react';

import type { Product } from '@/api/product';
import { ProductGalleryLightbox } from '@/components/products/product-gallery-lightbox';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

// `react-share` is heavy and only renders when sharing is enabled, so keep it out of the gallery's
// initial client chunk and load it on demand.
const ProductGalleryShare = dynamic(
    () => import('@/components/products/product-gallery-share').then((m) => m.ProductGalleryShare),
    { ssr: false },
);

export type ProductGalleryProps = {
    initialImageId?: string | null;
    images: ShopifyImage[] | null;
    actions?: ReactNode | ReactNode[];
    enableShare?: boolean;
    padding?: boolean;
    pageUrl: string;
    i18n: LocaleDictionary;
    product: Product;
    primaryImageClassName?: string;
} & HTMLProps<HTMLDivElement>;
/**
 * Interactive image gallery with a thumbnail strip, a click-to-zoom lightbox, and social share buttons.
 *
 * Visuals are driven by the P3 semantic tokens (`--surface-*`/`--text*`/`--border-*`) and the shared
 * `focus-ring` utility, so a theme-less shop renders sensibly and a tenant theme recolors the set.
 * The primary image cross-fades on selection via a `motion-safe` CSS opacity transition keyed off its
 * load state — no JS timer — so reduced-motion users get an instant swap. Selecting a thumbnail
 * promotes it to the primary slot; activating the primary image opens a full-screen lightbox. The
 * custom Shopify image loader sizes each request to its rendered box via `srcset`; no blur placeholder
 * is wired despite `thumbhash` being fetched. On mobile the gallery stacks (primary image, then a
 * horizontal-scroll thumbnail strip); md+ pins it sticky with a thumbnail grid.
 *
 * @param props.initialImageId - ID of the image to show first; falls back to the first image when absent or unmatched.
 * @param props.images - Array of Shopify images to display; returns `null` when empty.
 * @param props.actions - Additional action nodes rendered alongside the share buttons.
 * @param props.enableShare - When `true`, renders email and social share buttons.
 * @param props.padding - When `true`, applies roomier inner padding to the primary image container.
 * @param props.pageUrl - Canonical URL forwarded to the share buttons.
 * @param props.i18n - Locale dictionary for the share, thumbnail, and lightbox control labels.
 * @param props.product - Product providing the SEO title used by share buttons.
 * @param props.primaryImageClassName - Additional CSS class names applied to the primary image element.
 * @returns The gallery section, or `null` when no images are provided.
 */
const ProductGallery = ({
    initialImageId,
    images,
    className,
    actions,
    enableShare = true,
    padding = true,
    pageUrl,
    i18n,
    product,
    primaryImageClassName,
    ...props
}: ProductGalleryProps) => {
    const [selected, setSelected] = useState<ShopifyImage | null>(null);
    const [loaded, setLoaded] = useState<boolean>(true);
    const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

    const { t } = getTranslations('common', i18n);

    /**
     * Promotes `image` to the primary slot and marks it not-yet-loaded so its CSS fade-in replays.
     *
     * @param image - The image to display as the primary image.
     */
    const setImage = useCallback((image: ShopifyImage) => {
        setSelected(image);
        setLoaded(false);
    }, []);

    if (!images || images.length <= 0) return null;

    const [firstImage] = images;
    if (!firstImage) return null;

    const initialImage = (initialImageId ? images.find(({ id }) => id === initialImageId) : undefined) ?? firstImage;
    const image = selected ?? initialImage;

    const loadingProps = !loaded ? { 'data-skeleton': true } : {};
    const title = enableShare ? product.seo.title || `${product.vendor} ${product.title}` : undefined;

    return (
        <section draggable={false} className={cn(className)} {...props}>
            {/* Desktop: a sticky two-column gallery — a vertical thumbnail rail beside the primary image.
             * Mobile: the rail drops below the primary image as a horizontal-scroll strip (order-2). */}
            <div className="flex w-full min-w-0 flex-col gap-2 overflow-clip md:sticky md:top-36 md:flex-row md:items-start md:gap-3">
                {images.length > 1 ? (
                    <aside className="order-2 -mx-1 flex shrink-0 flex-row gap-2 overflow-x-auto px-1 md:order-1 md:mx-0 md:max-h-[40rem] md:w-20 md:flex-col md:overflow-y-auto md:overflow-x-visible md:px-0 lg:w-24">
                        {images
                            .filter(({ id }) => image.id !== id)
                            .map((thumbnail, index) => {
                                return (
                                    <button
                                        type="button"
                                        key={thumbnail.id ?? thumbnail.url}
                                        aria-label={t('view-image', index + 1)}
                                        onClick={() => setImage(thumbnail)}
                                        className="focus-ring hover:border-(color:var(--accent)) flex size-16 shrink-0 appearance-none items-center justify-center rounded-lg border-(--border-default) border-2 border-solid bg-(--surface-2) p-1 motion-safe:transition-colors md:aspect-4/5 md:size-auto md:w-full md:p-2"
                                    >
                                        <Image
                                            className="size-14 object-contain object-center md:aspect-4/5 md:size-full"
                                            role={thumbnail.altText ? undefined : 'presentation'}
                                            src={thumbnail.url}
                                            alt={thumbnail.altText ?? ''}
                                            title={thumbnail.altText ?? undefined}
                                            width={thumbnail.width ?? 175}
                                            height={thumbnail.height ?? 175}
                                            sizes="(max-width: 920px) 75px, 120px"
                                            loading="eager"
                                            decoding="async"
                                            draggable={false}
                                        />
                                    </button>
                                );
                            })}
                    </aside>
                ) : null}

                <div
                    className={cn(
                        'relative order-1 flex w-full min-w-0 grow items-center justify-center overflow-hidden rounded-lg border border-(--border-default) border-solid bg-(--surface-2) p-2 md:order-2 md:h-full md:p-3',
                        padding && 'p-4 py-6 md:p-8',
                    )}
                    {...loadingProps}
                >
                    <button
                        type="button"
                        aria-label={t('zoom-image')}
                        onClick={() => setLightboxOpen(true)}
                        className="focus-ring z-5 flex h-fit min-h-32 w-full transform-gpu cursor-zoom-in appearance-none items-center justify-center overflow-hidden md:h-full md:max-h-144"
                    >
                        <Image
                            key={image.url}
                            role={image.altText ? undefined : 'presentation'}
                            src={image.url}
                            alt={image.altText ?? ''}
                            title={image.altText ?? undefined}
                            width={image.width ?? 500}
                            height={image.height ?? 500}
                            sizes="(max-width: 920px) 100vw, 500px"
                            priority
                            decoding="async"
                            onLoad={() => setLoaded(true)}
                            className={cn(
                                'h-fit w-full object-contain object-center md:h-full md:max-h-144',
                                loaded ? 'opacity-100' : 'opacity-0',
                                'motion-safe:transition-opacity motion-safe:duration-500',
                                primaryImageClassName,
                            )}
                        />
                    </button>

                    {loaded && enableShare ? (
                        <div
                            className={cn(
                                'absolute inset-x-2 top-2 flex flex-row-reverse items-start justify-between gap-2',
                                'hidden md:flex',
                            )}
                        >
                            <ProductGalleryShare pageUrl={pageUrl} title={title} i18n={i18n} actions={actions} />

                            {image.altText ? (
                                <div className="text-(color:var(--text-muted)) rounded-lg bg-(--surface-1) p-1 px-2 font-semibold text-sm opacity-80">
                                    {image.altText}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <ProductGalleryLightbox
                image={image}
                open={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                i18n={i18n}
            />
        </section>
    );
};

ProductGallery.displayName = 'Nordcom.Products.Gallery';

export { ProductGallery };
