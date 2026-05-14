import { generatePageMetadata, RootPage } from '@payloadcms/next/views';
import type { Metadata } from 'next';
import config from '../../../../payload.config';
import { importMap } from '../../cms/importMap';

// Payload's admin RSC tree reads `cookies()` / `headers()` extensively (auth
// state, locale, theme). Without `force-dynamic`, Next 16's default segment
// behaviour treats this catch-all as eligible for caching — and any dynamic
// API call inside the cached tree throws `DYNAMIC_SERVER_USAGE`, which then
// short-circuits the entire render. Symptom in prod: the page returns an
// HTML shell *without* the CSS/JS links that the manifest assigned to it,
// so editors see "everything unstyled + nav broken + redirects nowhere"
// even though the chunks are sitting in `.next/static/`.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Args = {
    params: Promise<{ segments: string[] }>;
    searchParams: Promise<Record<string, string | string[]>>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
    generatePageMetadata({ config, params, searchParams });

const Page = ({ params, searchParams }: Args) => RootPage({ config, params, searchParams, importMap });

export default Page;
