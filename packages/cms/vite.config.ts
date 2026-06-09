import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/commerce-cms';

export default mergeConfig(
    base,
    defineConfig({
        optimizeDeps: {
            force: true,
        },
        root: resolve(__dirname),
        build: {
            target: 'esnext',
            rolldownOptions: {
                external: [
                    'mongoose',
                    'mongodb',
                    'payload',
                    'react',
                    'react-dom',
                    'server-only',
                    // sharp is a native Node module the derivative generator loads lazily; bundling
                    // it would drag .node binaries into the library build.
                    'sharp',
                    /^@payloadcms\//,
                    /^@faceless-ui\//,
                    /^next($|\/)/,
                    /^next-auth($|\/)/,
                ],
                output: {
                    name,
                },
            },
        },
        plugins: process.env.CI
            ? [
                  codecovVitePlugin({
                      enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                      bundleName: name,
                      uploadToken: process.env.CODECOV_TOKEN,
                  }),
              ]
            : [],
    }),
);
