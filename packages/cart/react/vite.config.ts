import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite';

import base from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/cart-react';

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
                external: ['react', 'react-dom', 'react/jsx-runtime', '@nordcom/cart-core'],
            },
        },
        plugins: [
            react(),
            ...(process.env.CI
                ? codecovVitePlugin({
                      enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                      bundleName: name,
                      uploadToken: process.env.CODECOV_TOKEN,
                  })
                : []),
        ],
    }),
);
