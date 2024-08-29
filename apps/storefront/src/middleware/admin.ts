/* c8 ignore start */
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

const ADMIN_HOSTNAME = 'admin.shops.nordcom.io';

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    url.hostname = ADMIN_HOSTNAME;

    // TODO: Redirect if the domain in the pathname doesn't match the primary domain.
    return NextResponse.rewrite(url);
};
/* c8 ignore end */
