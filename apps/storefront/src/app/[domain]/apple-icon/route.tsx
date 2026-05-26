import { NotFoundError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { cacheLife } from 'next/cache';
import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';
import { Shop } from '@/api/_loaders';

export type AppleIconRouteParams = Promise<{
    domain: string;
}>;

// `'use cache'` cannot wrap a Route Handler body, and the cache layer rejects
// class instances (Response/ImageResponse) and tainted strings (private
// tokens transitively pulled in by `Shop.findByDomain` when other request
// paths call `experimental_taintUniqueValue`). Cache the bare icon URL only.
async function getAppleIconSrc(domain: string): Promise<string | null> {
    'use cache';
    cacheLife('max');

    try {
        const shop = await Shop.findByDomain(domain);
        return shop.icons?.favicon?.src ?? null;
    } catch {
        return null;
    }
}

export async function GET({}: NextRequest, { params }: { params: AppleIconRouteParams }) {
    const { domain } = await params;
    const width = 512;
    const height = 512;

    try {
        const src = await getAppleIconSrc(domain);
        if (!src) {
            throw new NotFoundError('apple-icon.png');
        }

        /** @see {@link https://vercel.com/docs/functions/edge-functions/og-image-generation/og-image-examples#using-an-external-dynamic-image} */
        return new ImageResponse(
            // biome-ignore lint/performance/noImgElement: Required by next/og ImageResponse, which renders to a raster image server-side.
            <img alt="apple-icon" width={width} height={height} src={src} title="apple-icon" />,
            {
                width,
                height,
            },
        );
    } catch (error: unknown) {
        const message = (error as Error)?.message ?? String(error);
        trace.getActiveSpan()?.addEvent('apple_icon.render_failed', {
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
