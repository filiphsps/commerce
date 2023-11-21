import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';

import { ShopApi } from '@/api/shop';
import { DefaultLocale } from '@/utils/locale';
import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { validateSize } from './validate-size';

/* c8 ignore start */
export type FaviconRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: FaviconRouteParams }) {
    const url = new URL(req.url);
    let width = url.searchParams.get('width') ? Number.parseFloat(url.searchParams.get('width')!) : null;
    let height = url.searchParams.get('height') ? Number.parseFloat(url.searchParams.get('height')!) : null;

    const errors = [...(await validateSize({ width, height }))];

    if (errors.length > 0) {
        return NextResponse.json(
            {
                status: errors[0].statusCode,
                tenant: domain,
                data: null,
                errors
            },
            {
                status: errors[0].statusCode
            }
        );
    }

    if (width && !height) height = width;
    else if (height && !width) width = height;
    else if (!width && !height) {
        width = 256;
        height = 256;
    }

    let src!: string;

    const shop = await ShopApi({ domain });
    const locale = DefaultLocale();
    const api = StorefrontApiClient({ shop, locale });
    const store = await StoreApi({ shop, locale, api });
    if (store.favicon?.src) {
        src = store.favicon.src;
    } else {
        src = req.url.replace('/favicon.png', '/icon.png');
    }

    // See https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-examples#using-an-external-dynamic-image
    const image = new ImageResponse(
        (
            // eslint-disable-next-line @next/next/no-img-element
            <img width={width!} height={height!} src={src} />
        ),
        {
            width: width!,
            height: height!
        }
    );

    return new NextResponse(image.body, {
        headers: {
            ...image.headers,
            'Content-Type': 'image/png' // TODO: Also add `image/x-icon`.
        },
        status: 200
    });
}
/* c8 ignore stop */
