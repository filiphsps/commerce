'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/tailwind';

export type CollectionBlockArrowsProps = {
    /** CSS selector pointing at the rail container element; used to find first/last children. */
    railSelector: string;
};

const ARROW_CLASSES = cn(
    // Inset the arrows just inside the rail wrapper. A negative offset (e.g. `-8px`) put them
    // outside the relative parent, where any ancestor with clipped horizontal overflow shears them.
    'absolute top-[38%] z-4 inline-flex size-9 cursor-pointer items-center justify-center',
    'rounded-full border border-(--product-card-border-color) bg-(--surface-0) shadow-product-card-hover',
    'font-semibold text-base text-(--product-card-title-color)',
    'focus-visible:outline-2 focus-visible:outline-(--accent) focus-visible:outline-offset-2',
    'motion-reduce:transition-none',
    'data-hidden:hidden',
    'pointer-coarse:hidden',
);

/**
 * Prev/next arrow buttons for a horizontal collection rail. Buttons hide
 * automatically when the matched first/last child is visible (uses
 * IntersectionObserver against the rail container). On touch devices both
 * arrows are hidden so native scroll wins.
 *
 * @param props - {@link CollectionBlockArrowsProps}.
 * @returns Two absolutely-positioned arrow buttons (siblings, no wrapper).
 */
const CollectionBlockArrows = ({ railSelector }: CollectionBlockArrowsProps) => {
    const railRef = useRef<HTMLElement | null>(null);
    const [firstVisible, setFirstVisible] = useState(true);
    const [lastVisible, setLastVisible] = useState(false);

    useEffect(() => {
        const rail = document.querySelector(railSelector);
        if (!(rail instanceof HTMLElement)) return;
        railRef.current = rail;
        const first = rail.firstElementChild;
        const last = rail.lastElementChild;
        if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.target === first) setFirstVisible(entry.isIntersecting);
                    if (entry.target === last) setLastVisible(entry.isIntersecting);
                }
            },
            { root: rail, threshold: 0.95 },
        );
        observer.observe(first);
        observer.observe(last);
        return () => observer.disconnect();
    }, [railSelector]);

    const scroll = (direction: 1 | -1) => {
        const rail = railRef.current;
        if (!rail) return;
        const child = rail.firstElementChild;
        const step = child instanceof HTMLElement ? child.getBoundingClientRect().width + 14 : 240;
        rail.scrollBy({ left: step * direction, behavior: 'smooth' });
    };

    const allVisible = firstVisible && lastVisible;

    return (
        <>
            <button
                type="button"
                aria-label="Previous"
                data-side="prev"
                onClick={() => scroll(-1)}
                {...(firstVisible || allVisible ? { 'data-hidden': '' } : {})}
                className={cn(ARROW_CLASSES, 'left-1')}
            >
                <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
                type="button"
                aria-label="Next"
                data-side="next"
                onClick={() => scroll(1)}
                {...(lastVisible || allVisible ? { 'data-hidden': '' } : {})}
                className={cn(ARROW_CLASSES, 'right-1')}
            >
                <ChevronRight aria-hidden className="size-5" />
            </button>
        </>
    );
};

CollectionBlockArrows.displayName = 'Nordcom.Products.CollectionBlockArrows';
export default CollectionBlockArrows;
