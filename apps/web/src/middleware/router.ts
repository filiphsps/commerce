import { ShopApi } from '@/api/shop';
import { shops } from '@/middleware/shops';
import { storefront } from '@/middleware/storefront';
import { unknown } from '@/middleware/unknown';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const getHostname = async (req: NextRequest): Promise<string> => {
    let hostname = (req.headers.get('host')!.replace('.localhost', '') || req.nextUrl.host).toLowerCase();

    // Remove port from hostname.
    hostname = hostname.split(':')[0]!;

    // Deal with development server and Vercel's preview URLs.
    if (hostname === 'localhost' || hostname.endsWith('.vercel.app') || hostname.endsWith('app.github.dev')) {
        if (process.env.SHOPS_DEV) {
            return 'shops.nordcom.io';
        }

        return 'www.sweetsideofsweden.com';
    }

    return hostname;
};

/**
 * `shops` - Marketing/admin dashboard request.\
 * `storefront` - Storefront request.\
 * `unknown` - Unknown request type.
 */
export type RequestType = 'shops' | 'storefront' | 'unknown';

/**
 * Determine the type of request we're dealing with.
 *
 * @param {NextRequest} req - The incoming request.
 * @returns {RequestType} The type of request.
 */
export const getRequestType = async (req: NextRequest): Promise<RequestType> => {
    const hostname = await getHostname(req);

    if (hostname === 'shops.nordcom.io') {
        return 'shops';
    } else if (hostname.includes('sweetsideofsweden.com')) {
        // Fast-path for the storefront.
        return 'storefront';
    }

    try {
        await ShopApi(hostname, true);
        return 'storefront';
    } catch (error) {
        console.warn(error);
        return 'unknown';
    }
};

export const router = async (req: NextRequest): Promise<NextResponse | undefined> => {
    const pathname = req.nextUrl.pathname;

    let type: RequestType;
    if (pathname.startsWith('/storefront')) {
        type = 'storefront';
    } else if (pathname.startsWith('/shops')) {
        type = 'shops';
    } else {
        type = await getRequestType(req);
    }

    // HACK: Mark it as RequestType | undefined to stop tsc from detecting
    //       the unreachable code path afterwards.
    switch (type as RequestType | undefined) {
        case 'storefront': {
            return storefront(req);
        }
        case 'shops': {
            return shops(req);
        }
        case 'unknown': {
            return unknown(req);
        }
    }

    return NextResponse.next();
};
