/* c8 ignore start */
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export const ADMIN_HOSTNAME = 'admin.shops.nordcom.io';

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    const newUrl = url.clone();

    // Remove the admin prefix.
    newUrl.pathname = url.pathname.replace('/admin', '');
    newUrl.hostname = ADMIN_HOSTNAME;

    const headers = new Headers();
    headers.set('x-nordcom-shop', url.hostname);

    return NextResponse.rewrite(newUrl, {
        request: { headers }
    });
};
/* c8 ignore end */
