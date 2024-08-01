import { Shop } from '@nordcom/commerce-db';
import { NotFoundError } from '@nordcom/commerce-errors';

import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';

import { validateSize } from './validate-size';

export const dynamic = 'force-static';
export const revalidate = false;

export type FaviconRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: FaviconRouteParams }) {
    if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
            status: 200
        });
    }

    const url = new URL(req.url);
    let width = url.searchParams.get('width') ? Number.parseFloat(url.searchParams.get('width')!) : null;
    let height = url.searchParams.get('height') ? Number.parseFloat(url.searchParams.get('height')!) : null;

    const errors = [...(await validateSize({ width, height }))];

    if (errors.length > 0) {
        return NextResponse.json(
            {
                status: errors[0]!.statusCode,
                tenant: domain,
                data: null,
                errors
            },
            {
                status: errors[0]!.statusCode
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

        const shop = await Shop.findByDomain(domain);
        if (shop.icons?.favicon?.src) {
            src = shop.icons.favicon.src;
        } else {
            throw new NotFoundError('favicon.png');
        }

        /** @see {@link https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-examples#using-an-external-dynamic-image} */
        return new ImageResponse(
            (
                // eslint-disable-next-line @next/next/no-img-element
                <img width={width!} height={height!} src={src} title="favicon" />
            ),
            {
                width: width!,
                height: height!,
                fonts: []
            }
        );
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
