import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes';
import config from '../../../../payload.config';

// Every Payload REST call inspects request auth via cookies/headers and
// returns per-user data — there is nothing cacheable here. `force-dynamic`
// prevents Next 16 from trying to cache responses (which would silently mix
// users' data) and the matching `DYNAMIC_SERVER_USAGE` render-time crash.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
