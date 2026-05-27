import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names using clsx and resolves Tailwind conflicts with tailwind-merge.
 *
 * @param inputs - Class values to merge; accepts strings, arrays, objects, and conditionals.
 * @returns A single deduplicated Tailwind class string.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
