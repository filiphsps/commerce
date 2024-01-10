import { ShopApi } from '@nordcom/commerce-database';
import { UnknownShopDomainError } from '@nordcom/commerce-errors';
import { NextResponse, type NextRequest } from 'next/server';
import pngToIco from 'png-to-ico';

export const runtime = 'nodejs';
export const revalidate = 28_800; // 8hrs.
export const dynamic = 'force-static';

export type FaviconRouteParams = {
    domain: string;
};
export const GET = async (req: NextRequest, { params }: any) => {
    try {
        const domain = params.domain as string;

        const shop = await ShopApi(domain);
        if (!shop) throw new UnknownShopDomainError(domain);

        const favicon = await fetch(new URL(shop.icons?.favicon?.src!), {
            next: {
                revalidate: 60 * 60 * 24, // 24hrs.
                tags: [shop.id, 'favicon', `${shop.id}.favicon`]
            }
        });
        const faviconBuffer = await favicon.arrayBuffer();
        const faviconIcoBuffer = await pngToIco(Buffer.from(new Uint8Array(faviconBuffer)));

        return new NextResponse(faviconIcoBuffer);
    } catch (error: unknown) {
        console.error(error);

        return NextResponse.json(
            {
                status: 500
            },
            {
                status: 500
            }
        );
    }
};
