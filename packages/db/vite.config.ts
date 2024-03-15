import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
    base,
    defineConfig({
        root: resolve(__dirname),
        build: {
            rollupOptions: {
                external: ['mongoose', 'monguito', 'uuid'],
                output: {
                    name: 'db'
                }
            }
        },
        plugins: []
    })
);
