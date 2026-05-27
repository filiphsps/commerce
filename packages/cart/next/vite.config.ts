import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/cart-next';

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
                output: {
                    name,
                },
                external: [
                    'next',
                    'next/headers',
                    'next/cache',
                    'next/server',
                    'react',
                    '@nordcom/cart-core',
                    '@nordcom/cart-react',
                ],
            },
        },
        plugins: process.env.CI
            ? codecovVitePlugin({
                  enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                  bundleName: name,
                  uploadToken: process.env.CODECOV_TOKEN,
              })
            : [],
    }),
);
