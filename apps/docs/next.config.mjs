import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextra from 'nextra';

const rawBasePath = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
const basePath = rawBasePath ? (rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`) : '';

const withNextra = nextra({
    contentDirBasePath: '/docs',
    defaultShowCopyCode: true,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: basePath || undefined,
    assetPrefix: basePath || undefined,
    images: { unoptimized: true },
    allowedDevOrigins: ['docs.localhost'],
    trailingSlash: true,
    reactStrictMode: true,
    typescript: { ignoreBuildErrors: false },
    turbopack: {
        root: path.resolve(path.join(__dirname, '../..')),
        resolveAlias: {
            // Nextra rewrites MDX imports to this virtual module; point it at our hook.
            'next-mdx-import-source-file': './mdx-components.tsx',
        },
    },
};

export default withNextra(nextConfig);
