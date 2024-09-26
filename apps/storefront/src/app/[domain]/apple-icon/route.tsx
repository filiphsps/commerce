import { NotFoundError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export type AppleIconRouteParams = Promise<{
    domain: string;
}>;
export async function GET({}: NextRequest, { params }: { params: AppleIconRouteParams }) {
    const { domain } = await params;

    let width = 512;
    let height = 512;

    try {
        let src!: string;

        const shop = await findShopByDomainOverHttp(domain);
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
    } catch (error: unknown) {
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
