import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const rawBasePath = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '';
const basePath = rawBasePath ? (rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`) : '';
const withMDX = createMDX();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: basePath || undefined,
    assetPrefix: basePath || undefined,
    images: { unoptimized: true },
    allowedDevOrigins: ['docs.localhost', 'localhost', 'worktree-feat-docs-nav-refactor.docs.localhost'],
    trailingSlash: true,
    reactStrictMode: true,
    serverExternalPackages: ['typescript', 'twoslash'],
    typescript: {
        ignoreBuildErrors: true,
        tsconfigPath: 'tsconfig.json',
    },
    turbopack: {
        root: path.resolve(path.join(__dirname, '../..')),
    },
    async redirects() {
        const { redirects } = await import('./lib/source-meta.generated.ts').catch(() => ({ redirects: [] }));
        return redirects;
    },
};

export default withMDX(nextConfig);
