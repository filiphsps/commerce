'use client';

import type { Image as ShopifyImage } from '@shopify/hydrogen-react/storefront-api-types';
import { X as CloseIcon } from 'lucide-react';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductGalleryLightboxProps = {
    image: ShopifyImage;
    open: boolean;
    onClose: () => void;
    i18n: LocaleDictionary;
};

/**
 * Full-screen modal presenting a single product image at large scale with click-to-zoom.
 *
 * Renders a native `<dialog>` so the browser supplies focus trapping, background inerting, and
 * Escape-to-dismiss; `open` is synced imperatively to `showModal()`/`close()` rather than the
 * `open` attribute so the top-layer + backdrop semantics apply. Clicking the image toggles a
 * magnified view, clicking the surrounding area or the close control dismisses. Surface, border,
 * text, and the dark backdrop scrim resolve from P3 tokens (`--surface-*`/`--border-*`/`--text`),
 * the focus ring from the shared `focus-ring` utility, and the zoom transform is gated under
 * `motion-safe`. The custom Shopify image loader serves a `sizes`-driven srcset (here `100vw` for the
 * full-screen view); no blur placeholder is wired despite `thumbhash` being available.
 *
 * @param props.image - Image to present; `url` is the source and `altText` the accessible name.
 * @param props.open - Whether the lightbox is shown; synced to the dialog's modal state.
 * @param props.onClose - Invoked on any dismissal (close control, surrounding click, or Escape).
 * @param props.i18n - Locale dictionary supplying the close/zoom control labels.
 * @returns The lightbox dialog element.
 */
export const ProductGalleryLightbox = ({ image, open, onClose, i18n }: ProductGalleryLightboxProps) => {
    const { t } = getTranslations('common', i18n);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [zoomed, setZoomed] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }

        // Reopen fit-to-screen rather than retaining a stale magnification.
        if (!open) {
            setZoomed(false);
        }
    }, [open]);

    // Dismiss on a click that lands on the dialog's own box (the backdrop) rather than its contents.
    // Bound imperatively so the dialog carries no synthetic `onClick` — Escape is already handled
    // natively, so the surface needs no separate keyboard handler.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handle = (event: globalThis.MouseEvent) => {
            if (event.target === dialog) {
                onClose();
            }
        };

        dialog.addEventListener('click', handle);
        return () => dialog.removeEventListener('click', handle);
    }, [onClose]);

    const altText = image.altText ?? undefined;

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            aria-label={altText ?? t('zoom-image')}
            className={cn(
                // A bare `flex` utility would override the UA `dialog:not([open]){display:none}`
                // rule, leaving the dialog laid out (and stacking against page z-index) even while
                // closed. Gate the flex on `[open]` and pin `hidden` as the closed-state display so
                // the dialog only paints once `showModal()` has promoted it into the top layer.
                'fixed inset-0 m-0 hidden h-dvh max-h-dvh w-dvw max-w-dvw items-center justify-center overflow-hidden bg-transparent p-4 open:flex md:p-8',
                'backdrop:bg-[color-mix(in_oklab,var(--text)_82%,transparent)]',
            )}
        >
            <button
                type="button"
                aria-label={t('close')}
                onClick={onClose}
                className="focus-ring text-(color:var(--text)) hover:border-(color:var(--accent)) hover:text-(color:var(--accent)) absolute top-4 right-4 z-10 flex h-10 w-10 appearance-none items-center justify-center rounded-full border-(--border-strong) border-2 border-solid bg-(--surface-2) transition-colors"
            >
                <CloseIcon className="stroke-2" aria-hidden={true} />
            </button>

            <button
                type="button"
                aria-label={zoomed ? t('zoom-out') : t('zoom-in')}
                onClick={() => setZoomed((value) => !value)}
                className={cn(
                    'focus-ring flex max-h-full max-w-full appearance-none items-center justify-center',
                    zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
                )}
            >
                <NextImage
                    role={altText ? undefined : 'presentation'}
                    src={image.url}
                    alt={altText ?? ''}
                    title={altText}
                    width={image.width ?? 1024}
                    height={image.height ?? 1024}
                    sizes="100vw"
                    decoding="async"
                    className={cn(
                        'h-auto max-h-[85dvh] w-auto max-w-[90dvw] object-contain object-center motion-safe:transition-transform motion-safe:duration-300',
                        zoomed && 'scale-150',
                    )}
                />
            </button>
        </dialog>
    );
};
ProductGalleryLightbox.displayName = 'Nordcom.Products.GalleryLightbox';
