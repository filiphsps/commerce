import { NextResponse } from 'next/server';

// Placeholder route. The actual cache-bust webhook lives on the storefront at
// `/<domain>/api/revalidate`; this admin-side handler exists only because the
// install scaffold expected one. Returning 500 made Shopify retry every
// delivery forever; 501 (Not Implemented) tells Shopify we will never accept
// it so it stops re-queuing. The previous `req.json()` (without `await`) also
// silently logged an unresolved Promise — drop it.
const NOT_IMPLEMENTED = { error: 'Shopify webhooks are handled by the storefront /api/revalidate route, not this app.' };
const headers = { 'Cache-Control': 'no-store' };

export const GET = async () => NextResponse.json(NOT_IMPLEMENTED, { status: 501, headers });
export const POST = async () => NextResponse.json(NOT_IMPLEMENTED, { status: 501, headers });
