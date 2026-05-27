import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names, resolving conflicts via `tailwind-merge`.
 *
 * @param inputs - One or more class values accepted by `clsx` (strings, arrays, conditionals).
 * @returns A single deduplicated, conflict-resolved class string.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
