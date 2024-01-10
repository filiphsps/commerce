import { ShopApi } from '@/api/shop';
import { NotFoundError } from '@nordcom/commerce-errors';
import { ImageResponse } from 'next/og';
import { NextResponse, type NextRequest } from 'next/server';

export type AppleIconRouteParams = {
    domain: string;
};
export async function GET(req: NextRequest, { params: { domain } }: { params: AppleIconRouteParams }) {
    let width = 512;
    let height = 512;

    try {
        let src!: string;

        const shop = await ShopApi(domain, true);
        if (shop.icons?.favicon?.src) {
            src = shop.icons.favicon.src;
        } else {
            throw new NotFoundError('apple-icon.png');
        }

        /** @see {@link https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-examples#using-an-external-dynamic-image} */
        return new ImageResponse(
            (
                // eslint-disable-next-line @next/next/no-img-element
                <img width={width} height={height} src={src} title="apple-icon" />
            ),
            {
                width,
                height
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
