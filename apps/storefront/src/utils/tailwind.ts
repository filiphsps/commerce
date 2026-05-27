import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names, resolving conflicts via `tailwind-merge` and handling conditional values via `clsx`.
 *
 * @param inputs - Any number of class value expressions (strings, arrays, objects).
 * @returns The merged class string, or `undefined` when the result is empty.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs)) || undefined;
}
