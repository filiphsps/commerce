import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const ADMIN_HOSTNAME = process.env.ADMIN_DOMAIN ?? 'admin.localhost';

// `req.nextUrl.hostname` derives from the (attacker-controlled) `Host` header.
// Without validation, a request with `Host: ../something` or `Host: weird/path`
// produces a redirect target the admin app then treats as a tenant slug —
// path traversal through the trusted-domain redirect.
const VALID_HOSTNAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;

/**
 * Handles requests whose first path segment is `admin` by redirecting to the
 * admin app at `ADMIN_HOSTNAME`. Validates the request hostname against a
 * strict allowlist regex before redirecting to prevent path-traversal attacks
 * where a crafted `Host` header could produce a malicious redirect target.
 *
 * @param req - The incoming Next.js edge request.
 * @returns A redirect to the admin app, or a 400 response for an invalid hostname.
 */
export const admin = async (req: NextRequest): Promise<NextResponse> => {
    const url = req.nextUrl.clone();
    const hostname = url.hostname;

    if (!hostname || hostname.length > 253 || !VALID_HOSTNAME.test(hostname)) {
        return new NextResponse('Bad Request', { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.redirect(`https://${ADMIN_HOSTNAME}/${encodeURIComponent(hostname)}/`);
};
