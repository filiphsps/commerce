import { ShopifyApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';

import { ShopApi } from '@/api/shop';
import { NotFoundError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';
import { validateSize } from './validate-size';

export type FaviconRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: FaviconRouteParams }) {
    const url = new URL(req.url);
    let width = url?.searchParams?.get?.('width') ? Number.parseFloat(url?.searchParams?.get?.('width')!) : null;
    let height = url?.searchParams?.get?.('height') ? Number.parseFloat(url?.searchParams?.get?.('height')!) : null;

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

    try {
        let src!: string;

        const shop = await ShopApi({ domain });
        if (shop?.configuration?.icons?.favicon?.src) {
            src = shop.configuration.icons.favicon.src;
        } else {
            const locale = Locale.default;
            const api = await ShopifyApiClient({ shop, locale });
            const store = await StoreApi({ api });

            if (store?.favicon?.src) {
                src = store.favicon.src;
            } else {
                throw new NotFoundError('favicon.png');
            }
        }

        /** @see {@link https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-examples#using-an-external-dynamic-image} */
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

        return NextResponse.json(image.body, {
            headers: {
                ...image.headers,
                'Content-Type': 'image/png' // TODO: Also add `image/x-icon`.
            },
            status: 200
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                status: 500,
                tenant: domain,
                data: null,
                errors: [error]
            },
            {
                status: 500
            }
        );
    }
}
