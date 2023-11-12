/**
 * Verifies if a handle is valid.
 *
 * @param {unknown} handle - The handle to verify.
 * @returns {boolean} Whether the handle is valid.
 */
export const isValidHandle = (handle: unknown): boolean => {
    if (!handle) return false;
    else if (typeof handle !== 'string') return false;
    else if (handle.length <= 1) return false;
    else if (['null', 'undefined', '[handle]', '[[...uid]]'].includes(handle.toLowerCase())) return false;

    return true;
};
