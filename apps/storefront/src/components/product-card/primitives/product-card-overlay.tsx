'use client';

import { X as CloseIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/utils/tailwind';

const DESKTOP_MEDIA_QUERY = '(min-width: 48em)';

function useIsDesktop(): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return matches;
}

export type ProductCardOverlayProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    label: string;
    anchorRef?: React.RefObject<HTMLElement | null>;
    children: ReactNode;
    className?: string;
};

const ProductCardOverlay = ({ open, onOpenChange, label, anchorRef, children, className }: ProductCardOverlayProps) => {
    const isDesktop = useIsDesktop();
    const titleId = useId();
    const surfaceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false);
        };
        const onDocClick = (e: MouseEvent) => {
            const surface = surfaceRef.current;
            const anchor = anchorRef?.current;
            if (!surface) return;
            if (surface.contains(e.target as Node)) return;
            if (anchor?.contains(e.target as Node)) return;
            onOpenChange(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDocClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDocClick);
        };
    }, [open, onOpenChange, anchorRef]);

    if (!open) return null;

    if (isDesktop) {
        return (
            <div
                ref={surfaceRef}
                role="dialog"
                aria-modal="false"
                aria-labelledby={titleId}
                className={cn(
                    'absolute top-full right-0 z-50 mt-1 flex flex-col gap-2 overflow-y-auto',
                    'max-h-(--product-card-overlay-max-height) w-(--product-card-overlay-width)',
                    'border-(length:--product-card-overlay-border-width) border-(color:var(--product-card-overlay-border-color)) border-solid',
                    'rounded-(--product-card-overlay-radius) bg-(--product-card-overlay-bg) p-(--product-card-overlay-padding)',
                    'shadow-product-card-overlay',
                    'motion-safe:animate-[product-card-overlay-in_var(--product-card-motion-overlay-in-duration)_var(--product-card-motion-overlay-in-ease)]',
                    className,
                )}
            >
                <header className="flex items-center justify-between">
                    <h3 id={titleId} className="font-semibold text-sm">
                        {label}
                    </h3>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        aria-label="Close"
                        className="rounded p-1 hover:bg-black/5"
                    >
                        <CloseIcon className="h-4 w-4" />
                    </button>
                </header>
                <div>{children}</div>
            </div>
        );
    }

    return (
        <div
            data-testid="product-card-overlay-sheet"
            ref={surfaceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
                'fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2',
                'rounded-t-(--product-card-overlay-radius) bg-(--product-card-overlay-bg)',
                'p-(--product-card-overlay-padding) pb-[max(var(--product-card-overlay-padding),env(safe-area-inset-bottom))]',
                'shadow-product-card-overlay',
                'max-h-[80vh] overflow-y-auto',
                'motion-safe:animate-[product-card-sheet-in_220ms_cubic-bezier(0.32,0.72,0,1)]',
                className,
            )}
        >
            <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-black/15" />
            <header className="flex items-center justify-between">
                <h3 id={titleId} className="font-semibold text-base">
                    {label}
                </h3>
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close"
                    className="rounded p-1 hover:bg-black/5"
                >
                    <CloseIcon className="h-5 w-5" />
                </button>
            </header>
            <div>{children}</div>
            <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => onOpenChange(false)}
                className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm motion-safe:animate-[product-card-overlay-fade-in_180ms_linear]"
            />
        </div>
    );
};

ProductCardOverlay.displayName = 'Nordcom.ProductCard.Overlay';
export default ProductCardOverlay;
