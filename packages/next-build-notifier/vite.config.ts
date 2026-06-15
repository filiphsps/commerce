import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codecovVitePlugin } from '@codecov/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vite';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = 'next-build-notifier';

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
                external: ['react', 'react-dom', 'react/jsx-runtime', 'next', 'next/server'],
                output: { name },
            },
        },
        plugins: [
            react(),
            codecovVitePlugin({
                enableBundleAnalysis: Boolean(process.env.CI) && !!process.env.CODECOV_TOKEN,
                bundleName: name,
                uploadToken: process.env.CODECOV_TOKEN,
            }),
        ],
    }),
);
