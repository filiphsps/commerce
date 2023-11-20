import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type RevalidateApiRouteParams = {
    domain: string;
};
const revalidate = async (req: NextRequest, params: RevalidateApiRouteParams) => {
    const body = await req.json();
    console.warn(body, params);

    // TODO: Detect if prismic or shopify request.
    revalidateTag('prismic');

    // TODO: API response builder or similar.
    return NextResponse.json(
        {
            status: 200,
            errors: null,
            data: {
                revalidated: true
            },
            metrics: {
                now: Date.now()
            }
        },
        { status: 200 }
    );
};

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return await revalidate(req, params);
}

export async function GET(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return await revalidate(req, params);
}
