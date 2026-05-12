/**
 * Sentinel handle used by `generateStaticParams` when a shop has no resources
 * of a given type (no blogs, no products, etc.). Cache Components requires at
 * least one entry, so we return this placeholder; `isValidHandle` rejects it
 * and the runtime page falls through to `notFound()`.
 */
export const NOT_FOUND_HANDLE = '__nordcom-not-found__';

/**
 * Verifies if a handle is valid.
 *
 * @param handle - The handle to verify.
 * @returns Whether the handle is valid.
 */
export const isValidHandle = (handle: unknown): boolean => {
    if (!handle) return false;
    else if (typeof handle !== 'string') return false;
    else if (handle.length <= 1) return false;
    else if (['null', 'undefined', '[handle]', '[[...uid]]', NOT_FOUND_HANDLE].includes(handle.toLowerCase())) {
        return false;
    }

    return true;
};
