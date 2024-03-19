import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
                    name: '@nordcom/commerce-db'
                }
            }
        },
        esbuild: {
            supported: {
                'top-level-await': true
            }
        }
    })
);
