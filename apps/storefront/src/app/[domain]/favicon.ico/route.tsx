import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export type FaviconRouteParams = {
    domain: string;
} & any; // FIXME: Don't use any here.

// TODO: Convert the png favicon to a proper ico instead of redirecting to the png.
export const GET = async (req: NextRequest, {}: FaviconRouteParams) => {
    let newUrl = req.nextUrl.clone();
    newUrl.pathname = newUrl.pathname.replace('.ico', '.png');

    return NextResponse.redirect(newUrl, { status: 302 });
};
