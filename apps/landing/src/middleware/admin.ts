/* c8 ignore start */
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export const ADMIN_HOSTNAME = 'admin.shops.nordcom.io';

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    const hostname = url.hostname;
    const headers = req.headers;

    // Remove the admin prefix.
    url.pathname = url.pathname.replace('/admin', '');

    url.hostname = ADMIN_HOSTNAME;
    headers.set('x-nordcom-shop', hostname);

    return NextResponse.rewrite(url, {
        request: { headers }
    });
};
/* c8 ignore end */
