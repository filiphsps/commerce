import { ShopApi } from '@/api/shop';
import { admin } from '@/middleware/admin';
import { storefront } from '@/middleware/storefront';
import { unknown } from '@/middleware/unknown';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const getHostname = async (req: NextRequest): Promise<string> => {
    let hostname = (req.headers.get('host')!.replace('.localhost', '') || req.nextUrl.host).toLowerCase();

    // Remove port from hostname.
    hostname = hostname.split(':')[0];

    // Deal with development server and Vercel's preview URLs.
    if (hostname === 'localhost' || hostname.endsWith('.vercel.app')) {
        if (process.env.SHOPS_DEV) {
            return 'shops.nordcom.io';
        }

        return 'sweetsideofsweden.com';
    }

    return hostname;
};

/**
 * `admin` - Admin dashboard request.\
 * `storefront` - Storefront request.\
 * `unknown` - Unknown request type.
 */
export type RequestType = 'admin' | 'storefront' | 'unknown';

/**
 * Determine the type of request we're dealing with.
 *
 * @param {NextRequest} req - The incoming request.
 * @returns {RequestType} The type of request.
 */
export const getRequestType = async (req: NextRequest): Promise<RequestType> => {
    const hostname = await getHostname(req);

    if (hostname === 'shops.nordcom.io') {
        return 'admin';
    }

    try {
        await ShopApi({ domain: hostname });
        return 'storefront';
    } catch (error) {
        console.warn(error);
        return 'unknown';
    }
};

export const router = async (req: NextRequest): Promise<NextResponse | undefined> => {
    const type: RequestType = await getRequestType(req);

    // Don't do anything if we're already on the admin or storefront,
    // as that would cause an infinite loop.
    if (/\/(admin|storefront)\//.test(req.nextUrl.pathname)) {
        return NextResponse.next();
    }

    // HACK: Mark it as RequestType | undefined to stop tsc from detecting
    //       the unreachable code path afterwards.
    switch (type as RequestType | undefined) {
        case 'storefront': {
            return storefront(req);
        }
        case 'admin': {
            return admin(req);
        }
        case 'unknown': {
            return unknown(req);
        }
    }

    return NextResponse.next();
};
