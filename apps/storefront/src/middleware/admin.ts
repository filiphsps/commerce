import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const ADMIN_HOSTNAME = `admin.${process.env.SERVICE_DOMAIN}`;

// `req.nextUrl.hostname` derives from the (attacker-controlled) `Host` header.
// Without validation, a request with `Host: ../something` or `Host: weird/path`
// produces a redirect target the admin app then treats as a tenant slug —
// path traversal through the trusted-domain redirect.
const VALID_HOSTNAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;

export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    const hostname = url.hostname;

    if (!hostname || hostname.length > 253 || !VALID_HOSTNAME.test(hostname)) {
        return new NextResponse('Bad Request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.redirect(`https://${ADMIN_HOSTNAME}/${encodeURIComponent(hostname)}/`);
};
