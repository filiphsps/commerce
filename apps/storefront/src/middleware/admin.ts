/* c8 ignore start */
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export const ADMIN_HOSTNAME = 'admin.shops.nordcom.io';

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    const hostname = url.hostname;

    return NextResponse.redirect(`https://${ADMIN_HOSTNAME}/${hostname}/`);
};
/* c8 ignore end */
