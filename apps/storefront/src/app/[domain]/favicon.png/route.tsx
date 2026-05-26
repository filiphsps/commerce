import { NotFoundError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { cacheLife } from 'next/cache';
import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';
import { Shop } from '@/api/_loaders';
import { BuildConfig } from '@/utils/build-config';
import { safeParseFloat } from '@/utils/pricing';

import { validateSize } from './validate-size';

export type FaviconRouteParams = Promise<{
    domain: string;
}>;

// `'use cache'` cannot wrap a Route Handler body, and the cache layer rejects
// class instances (Response/ImageResponse) and tainted strings (private
// tokens transitively pulled in by `Shop.findByDomain` when other request
// paths call `experimental_taintUniqueValue`). Cache the bare icon URL only.
async function getFaviconSrc(domain: string): Promise<string | null> {
    'use cache';
    cacheLife('max');

    try {
        const shop = await Shop.findByDomain(domain);
        return shop.icons?.favicon?.src ?? null;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest, { params }: { params: FaviconRouteParams }) {
    const { domain } = await params;
    const searchParams = req.nextUrl.searchParams;
    const widthParam = searchParams.get('width') ?? searchParams.get('w');
    const heightParam = searchParams.get('height') ?? searchParams.get('h');

    let width = safeParseFloat(null, widthParam);
    let height = safeParseFloat(null, heightParam);

    const validationErrors = [...validateSize({ width, height })];
    if (validationErrors.length > 0) {
        const first = validationErrors[0];
        return NextResponse.json(
            {
                status: first.statusCode,
                tenant: domain,
                data: null,
                errors: validationErrors.map((e) => ({
                    statusCode: e.statusCode,
                    name: e.name,
                    code: e.code,
                    details: e.details,
                    description: e.description,
                })),
            },
            { status: first.statusCode },
        );
    }

    if (width && !height) height = width;
    else if (height && !width) width = height;
    else if (!width && !height) {
        width = 256;
        height = 256;
    }

    try {
        const src = await getFaviconSrc(domain);
        if (!src) {
            throw new NotFoundError('favicon.png');
        }

        if (BuildConfig.environment !== 'production') {
            return NextResponse.redirect(src, 307);
        }

        /** @see {@link https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-examples#using-an-external-dynamic-image} */
        return new ImageResponse(
            // biome-ignore lint/performance/noImgElement: Required by next/og ImageResponse, which renders to a raster image server-side.
            <img alt="favicon" width={width!} height={height!} src={src} title="favicon" />,
            {
                width: width!,
                height: height!,
                fonts: [],
            },
        );
    } catch (error: unknown) {
        const message = (error as Error)?.message ?? String(error);
        trace.getActiveSpan()?.addEvent('favicon.render_failed', {
            'error.message': message,
            'shop.domain': domain,
        });

        return NextResponse.json(
            {
                status: 500,
                tenant: domain,
                data: null,
                errors: [{ message }],
            },
            { status: 500 },
        );
    }
}
