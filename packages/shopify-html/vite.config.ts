// @ts-nocheck
// Editor-only suppression: this file isn't included in any tsconfig (it's tooling, not source). Build still type-checks via vite's own tsc invocation.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/commerce-shopify-html';

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
