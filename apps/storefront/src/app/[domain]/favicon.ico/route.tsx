import { type NextRequest, NextResponse } from 'next/server';

export type FaviconRouteParams = Promise<{
    domain: string;
}>;

// TODO: Convert the png favicon to a proper ico instead of redirecting to the png.
export const GET = async (req: NextRequest, { params }: { params: FaviconRouteParams }) => {
    const { domain } = await params;
    const search = req.nextUrl.search;

    const newUrl = new URL(`/${domain}/favicon.png${search}`, req.nextUrl.origin);

    return NextResponse.redirect(newUrl, { status: 302 });
};
