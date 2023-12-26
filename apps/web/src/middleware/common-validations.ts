import { UnreachableError } from '@/utils/errors';
import type { NextURL } from 'next/dist/server/web/next-url';

export const DOUBLE_SLASHES = /\/\//g;

export const commonValidations = <T extends string | NextURL | URL>(url: T): T => {
    let path: string;
    if (typeof url === 'string') {
        path = url;
    } else {
        path = url.pathname;
    }

    // Remove `x-default` if it's still there.
    path = path.replaceAll('x-default/', '');

    // Make sure we don't have any double slashes, except for the ones
    // in the protocol.
    if (path.includes('://')) {
        const chunks = path.split('://');
        path = `${chunks[0]}://${chunks[1]!.replaceAll(DOUBLE_SLASHES, '/')}`;
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
            const [pathname, query] = path.split('?');
            if (!pathname!.endsWith('/')) {
                path = `${pathname}/?${query}`;
            }
        } else {
            path += '/';
        }
    }

    if (typeof url === 'string') {
        return path as T;
    } else {
        url.pathname = path;
        return url;
    }

    // eslint-disable-next-line no-unreachable
    throw new UnreachableError();
};
