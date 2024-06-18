import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 60 * 60 * 8; // 8 hours.
export const dynamic = 'force-static';

export type FaviconRouteParams = {
    domain: string;
};

// TODO: Convert the png favicon to a proper ico instead of redirecting to the png.
export const GET = async (req: NextRequest, {}: FaviconRouteParams) => {
    const url = req.nextUrl.clone();
    url.pathname = '/favicon.png';

    return NextResponse.redirect(url, req);
};
