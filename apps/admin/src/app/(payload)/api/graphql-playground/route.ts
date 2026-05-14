import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes';
import config from '../../../../payload.config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = GRAPHQL_PLAYGROUND_GET(config);
