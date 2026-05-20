// apps/docs/next.config.mjs
import nextra from 'nextra';

const rawBasePath = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
const basePath = rawBasePath ? (rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`) : '';

const withNextra = nextra({
    contentDirBasePath: '/docs',
    defaultShowCopyCode: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: basePath || undefined,
    assetPrefix: basePath || undefined,
    images: { unoptimized: true },
    trailingSlash: true,
    reactStrictMode: true,
    typescript: { ignoreBuildErrors: false },
    eslint: { ignoreDuringBuilds: true }, // we use Biome
};

export default withNextra(nextConfig);
