import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/commerce-db';

export default mergeConfig(
    base,
    defineConfig({
        optimizeDeps: {
            esbuildOptions: {
                target: 'esnext'
            }
        },
        root: resolve(__dirname),
        build: {
            target: 'esnext',
            rollupOptions: {
                external: ['mongoose'],
                output: {
                    name
                }
            }
        },
        esbuild: {
            supported: {
                'top-level-await': true
            }
        },
        plugins: [
            codecovVitePlugin({
                enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                bundleName: name,
                uploadToken: process.env.CODECOV_TOKEN
            })
        ]
    })
);
