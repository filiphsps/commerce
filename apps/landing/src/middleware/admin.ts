import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const ADMIN_HOSTNAME = `admin.${process.env.SERVICE_DOMAIN}`;

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    const newUrl = url.clone();

    // Strip only the LEADING `/admin` segment — `.replace('/admin', '')`
    // hits the first occurrence anywhere, so `/admin-fake/admin` would have
    // become `/-fake/admin`. The anchored regex matches `/admin/...`,
    // `/admin`, but not `/admin-foo/...`.
    newUrl.pathname = url.pathname.replace(/^\/admin(?=\/|$)/, '') || '/';
    newUrl.hostname = ADMIN_HOSTNAME;
    newUrl.searchParams.set('shop', url.hostname);

    const headers = new Headers(req.headers);
    headers.set('x-nordcom-shop', url.hostname);
    if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
        headers.set('x-vercel-protection-bypass', process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
    } else {
        console.warn(new MissingEnvironmentVariableError('VERCEL_AUTOMATION_BYPASS_SECRET'));
    }

    return NextResponse.rewrite(newUrl, {
        request: { headers },
    });
};
