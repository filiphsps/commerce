import { NotFoundError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { BuildConfig } from '@/utils/build-config';
import { safeParseFloat } from '@/utils/pricing';
import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';

import { validateSize } from './validate-size';

export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type FaviconRouteParams = Promise<{
    domain: string;
}>;
export async function GET(req: NextRequest, { params }: { params: FaviconRouteParams }) {
    const { domain } = await params;

    const searchParams = req.nextUrl.searchParams;
    let width = safeParseFloat(null, searchParams.get('width') ?? searchParams.get('w'));
    let height = safeParseFloat(null, searchParams.get('height') ?? searchParams.get('h'));

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

        const shop = await findShopByDomainOverHttp(domain);
        if (shop.icons?.favicon?.src) {
            src = shop.icons.favicon.src;
        } else {
            throw new NotFoundError('favicon.png');
        }

        if (BuildConfig.environment !== 'production') {
            return NextResponse.redirect(src, 307);
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
