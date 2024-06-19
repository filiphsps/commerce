import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 60 * 60 * 8; // 8 hours.

export type FaviconRouteParams = {
    domain: string;
};

// TODO: Convert the png favicon to a proper ico instead of redirecting to the png.
export const GET = async (req: NextRequest, {}: FaviconRouteParams) => {
    let newUrl = req.nextUrl.clone();
    newUrl.pathname = newUrl.pathname.replace('/favicon.ico', '/favicon.png');
    return NextResponse.redirect(newUrl);
};
