import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names. Passes all inputs through `clsx` for
 * conditional-class resolution, then `twMerge` to deduplicate conflicting
 * Tailwind utilities (e.g. `p-2` vs `p-4`).
 *
 * @param inputs - Class values: strings, arrays, objects, or falsy values.
 * @returns A merged, deduplicated class name string.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
