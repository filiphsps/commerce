import { NotFoundError } from '@nordcom/commerce-errors';
import { isProduction } from '@nordcom/commerce-utils';
import { trace } from '@opentelemetry/api';
import { cacheLife, cacheTag } from 'next/cache';
import { ImageResponse } from 'next/og';
import { type NextRequest, NextResponse } from 'next/server';
import { Shop } from '@/api/_loaders';
import { tenantRootTags } from '@/cache';
import { safeParseFloat } from '@/utils/pricing';

import { validateSize } from './validate-size';

export type FaviconRouteParams = Promise<{
    domain: string;
}>;

/**
 * Resolve a tenant's favicon source URL from its shop record, cached.
 *
 * `'use cache'` cannot wrap a Route Handler body, and the cache layer rejects
 * class instances (Response/ImageResponse) and tainted strings (private tokens
 * transitively pulled in by `Shop.findByDomain` when other request paths call
 * `experimental_taintUniqueValue`). So the cached unit is the bare icon URL —
 * never the shop object. The entry carries the tenant-root tags so a
 * shop-record edit (icon/domain change) busts the `cacheLife('max')` entry via
 * the broad `shopify.<id>` sweep; without a tag it would stick indefinitely.
 *
 * A resolution failure is allowed to propagate rather than caching `null`: under
 * `'use cache'` a thrown error is never stored, so a transient lookup blip — or a
 * not-yet-resolvable hostname for a newly-added tenant — is retried next request
 * instead of being frozen blank at `max`. Only a successful, tagged resolution is
 * cached.
 *
 * @param domain - Hostname used to resolve the shop and its icon.
 * @returns The icon source URL, or `null` when the shop has no icon configured.
 * @throws When the shop cannot be resolved for the domain (intentionally uncached).
 */
async function getFaviconSrc(domain: string): Promise<string | null> {
    'use cache';
    cacheLife('max');

    const shop = await Shop.findByDomain(domain);
    cacheTag(...tenantRootTags(shop));
    return shop.icons?.favicon?.src ?? null;
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

        if (!isProduction()) {
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
