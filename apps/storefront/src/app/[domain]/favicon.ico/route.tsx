import { cacheLife } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export type FaviconRouteParams = {
    domain: string;
};

// TODO: Convert the png favicon to a proper ico instead of redirecting to the png.
export const GET = async (req: NextRequest, {}: FaviconRouteParams) => {
    'use cache';
    cacheLife('max');

    let newUrl = req.nextUrl.clone();
    newUrl.pathname = newUrl.pathname.replace('.ico', '.png');

    return NextResponse.redirect(newUrl, { status: 302 });
};
