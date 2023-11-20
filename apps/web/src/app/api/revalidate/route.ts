import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/* c8 ignore start */
export type RevalidateApiRouteParams = {};
const revalidate = async (req: NextRequest, {}: RevalidateApiRouteParams) => {
    // TODO: Detect if prismic or shopify request.
    revalidateTag('prismic');

    const body = await req.json();
    console.warn(body, params);

    // TODO: API response builder or similar.
    return NextResponse.json({
        status: 200,
        errors: null,
        data: {
            revalidated: true,
        },
        metrics: {
            now: Date.now()
        }
    }, { status: 200 });
};

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return await revalidate(req, params);
}

export async function GET(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return await revalidate(req, params);
}
/* c8 ignore stop */
