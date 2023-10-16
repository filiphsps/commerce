export const isValidHandle = (handle: any): boolean => {
    if (!handle) return false;
    else if (typeof handle !== 'string') return false;
    else if (handle.length <= 0) return false;
    else if (['null', 'undefined', '[handle]', '[[...uid]]'].includes(handle.toLowerCase())) return false;

    return true;
};
