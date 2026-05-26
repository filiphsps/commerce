import { cn } from '@/utils/tailwind';
import type { RenderDensity } from './types';

/**
 * Computes the Tailwind class string for a chip-style option value renderer.
 * Replaces the old `chip.module.css` rules in a single, sharable helper so
 * `TextChipRenderer` and `SizeChipRenderer` can't drift visually.
 *
 * @param input - The chip state: `selected`, `available`, `density`.
 * @returns The composed `cn(...)` class string.
 */
export function chipClassName({
    selected,
    available,
    density,
}: {
    selected: boolean;
    available: boolean;
    density: RenderDensity;
}): string | undefined {
    return cn(
        'box-border inline-flex flex-col items-center justify-center rounded-(--block-border-radius-small) border-2 border-(--color-block-light) bg-(--color-block-light) text-center font-bold text-(--color-dark) text-sm leading-none no-underline shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[transform,box-shadow,border-color,color] duration-150 ease-out select-none focus-visible:outline-2 focus-visible:outline-(--accent-primary) focus-visible:outline-offset-2',
        density === 'compact'
            ? 'min-h-8 px-(--block-padding) py-0.5'
            : 'min-h-12 px-(--block-padding) py-(--block-padding-small)',
        available &&
            !selected &&
            'cursor-pointer motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[0_4px_12px_-2px_color-mix(in_srgb,var(--color-dark)_12%,transparent)]',
        selected &&
            'border-(--accent-primary) text-(--accent-primary) shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_30%,transparent),0_1px_0_0_color-mix(in_srgb,var(--accent-primary)_18%,transparent)] motion-safe:animate-[chip-stamp_150ms_ease-out]',
        !available &&
            'cursor-not-allowed pointer-events-none text-[color-mix(in_srgb,var(--color-dark)_60%,transparent)] [background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--color-dark)_6%,transparent)_4px_5px)]',
    );
}
