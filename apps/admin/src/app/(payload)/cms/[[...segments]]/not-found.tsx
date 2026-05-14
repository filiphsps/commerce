import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views';
import type { Metadata } from 'next';
import config from '../../../../payload.config';
import { importMap } from '../../cms/importMap';

// See page.tsx — same reasoning: NotFound renders Payload's admin shell and
// reads dynamic auth/locale APIs.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Args = {
    params: Promise<{ segments: string[] }>;
    searchParams: Promise<Record<string, string | string[]>>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
    generatePageMetadata({ config, params, searchParams });

const NotFound = ({ params, searchParams }: Args) => NotFoundPage({ config, params, searchParams, importMap });

export default NotFound;
