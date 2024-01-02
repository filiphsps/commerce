import { withAppRouterHighlight } from '@/utils/config/highlight.app';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAppRouterHighlight(async (req: NextRequest, _context) => {
    console.debug('GET Shopify Webhook', req);

    return NextResponse.json(
        {
            status: 500,
            data: null,
            errors: null
        },
        { status: 500 }
    );
});

export const POST = withAppRouterHighlight(async (req: NextRequest, _context) => {
    console.debug('POST Shopify Webhook', req.json());

    return NextResponse.json(
        {
            status: 500,
            data: null,
            errors: null
        },
        { status: 500 }
    );
});
