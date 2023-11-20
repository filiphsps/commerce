import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export type RevalidateApiRouteParams = {
    domain: string;
};
const revalidate = async (req: NextRequest, params: RevalidateApiRouteParams) => {
    const errors: any[] = [];

    try {
        console.warn(params);

        if (req.method === 'POST') {
            const body = await req.json();
            console.warn(body);
        }
    } catch (error: any) {
        errors.push(error);
    }

    // TODO: Detect if prismic or shopify request.
    revalidateTag('prismic');
    revalidateTag('shopify');
    // revalidateTag(domain);

    // TODO: API response builder or similar.
    const status = errors.length > 0 ? 500 : 200;
    return NextResponse.json(
        {
            status,
            errors: errors.length > 0 ? errors : null,
            data: {
                revalidated: true
            },
            metrics: {
                now: Date.now()
            }
        },
        { status }
    );
};

export async function POST(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return await revalidate(req, params);
}

export async function GET(req: NextRequest, { params }: { params: RevalidateApiRouteParams }) {
    return await revalidate(req, params);
}
