import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = async (req: NextRequest) => {
    console.debug('GET Shopify Webhook', req);

    return NextResponse.json(
        {
            status: 500,
            data: null,
            errors: null
        },
        { status: 500 }
    );
};

export const POST = async (req: NextRequest) => {
    console.debug('POST Shopify Webhook', req.json());

    return NextResponse.json(
        {
            status: 500,
            data: null,
            errors: null
        },
        { status: 500 }
    );
};
