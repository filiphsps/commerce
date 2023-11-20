import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';

/* c8 ignore start */
const revalidate = async (req: NextRequest) => {
    // TODO: Detect if prismic or shopify request.
    revalidateTag('prismic');

    const body = req.json();
    console.warn(body);

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
    });
};

export async function POST(req: NextRequest) {
    return await revalidate(req);
}

export async function GET(req: NextRequest) {
    return await revalidate(req);
}
/* c8 ignore stop */
