import type { NextURL } from 'next/dist/server/web/next-url';

export const commonValidations = (url: NextURL): NextURL => {
    // Remove `/admin/` and `/storefront/` paths.
    url.pathname = url.pathname.replace(/\/(admin|storefront)\//, '/');

    // Remove `x-default` if it's still there.
    url.pathname = url.pathname.replaceAll('x-default/', '');

    // Make sure we don't have any double slashes.
    url.pathname = url.pathname.replaceAll(/\/\//g, '/');

    // Make sure we end with a slash.
    if (
        !url.pathname.endsWith('/') &&
        !/((?!\.well-known(?:\/.*)?)(?:[^/]+\/)*[^/]+\.\w+)/.test(url.pathname) &&
        !/\.(.*)$/.test(url.pathname)
    ) {
        url.pathname += '/';
    }

    return url;
};
