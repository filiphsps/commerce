import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes';
import config from '../../../../payload.config';

// See REST route — GraphQL responses are also per-user.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const POST = GRAPHQL_POST(config);
export const OPTIONS = REST_OPTIONS(config);
