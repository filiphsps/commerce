import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = 'react-payment-brand-icons';

export default mergeConfig(
    base,
    defineConfig({
        optimizeDeps: {
            force: true,
        },
        root: resolve(__dirname),
        plugins: [
            react(),
            ...(process.env.CI
                ? [
                      codecovVitePlugin({
                          enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                          bundleName: name,
                          uploadToken: process.env.CODECOV_TOKEN,
                      }),
                  ]
                : []),
        ],
        build: {
            target: 'esnext',
            rolldownOptions: {
                output: {
                    name,
                },
            },
        },
    }),
);
