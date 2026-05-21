import type { NextURL } from 'next/dist/server/web/next-url';

export const DOUBLE_SLASHES = /\/\//g;

export const commonValidations = <T extends string | NextURL | URL>(url: T): T => {
    let path: string = '';
    if (typeof url === 'string') {
        path = url;
    } else {
        path = url.pathname;
    }

    // Remove `x-default` if it's still there.
    path = path.replaceAll('x-default/', '');

    // Remove double hyphens.
    path = path.replaceAll('--', '-');

    // Make sure we don't have any double slashes, except for the ones
    // in the protocol.
    if (path.includes('://')) {
        const [scheme = '', rest = ''] = path.split('://');
        path = `${scheme}://${rest.replaceAll(DOUBLE_SLASHES, '/')}`;
    } else {
        path = path.replaceAll(DOUBLE_SLASHES, '/');
    }

    // Make sure we end with a slash.
    if (
        !path.endsWith('/') &&
        !/((?!\.well-known(?:\/.*)?)(?:[^/]+\/)*[^/]+\.\w+)/.test(path) &&
        !/\.(.*)$/.test(path)
    ) {
        if (path.includes('?')) {
            const [pathname = '', query = ''] = path.split('?');
            if (!pathname.endsWith('/')) {
                path = `${pathname}/?${query}`;
            }
        } else {
            path += '/';
        }
    }

    // Check casing of locale, eg make sure it's `en-US` and not `en-us`.
    const firstLocaleMatch = path.match(/\/([a-zA-Z]{2}-[a-zA-Z]{2})/g)?.[0];
    if (firstLocaleMatch) {
        const [language, country] = firstLocaleMatch.split('-');
        if (language && country) {
            path = path.replace(firstLocaleMatch, `${language.toLowerCase()}-${country.toUpperCase()}`);
        }
    }

    if (typeof url === 'string') {
        return path as T;
    }

    url.pathname = path;
    return url;
};
