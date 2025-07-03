import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { codecovVitePlugin } from '@codecov/vite-plugin';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsConfigPaths from 'vite-tsconfig-paths';

import base from '../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = '@nordcom/commerce-marketing-common';

export default mergeConfig(
    base,
    defineConfig({
        optimizeDeps: {
            external: ['mongoose', 'mongodb'],
            esbuildOptions: {
                target: 'esnext'
            }
        },
        root: resolve(__dirname),
        build: {
            target: 'esnext',
            rollupOptions: {
                output: {
                    name: name
                }
            }
        },
        plugins: [
            tsConfigPaths(),
            dts({
                clearPureImport: false,
                copyDtsFiles: true,
                entryRoot: 'src',
                insertTypesEntry: true,
                rollupTypes: false,
                tsconfigPath: `./tsconfig.json`,
                include: ['**/src']
            }) as any /* FIXME: Update dts to latest vite */,
            codecovVitePlugin({
                enableBundleAnalysis: !!process.env.CODECOV_TOKEN,
                bundleName: name,
                uploadToken: process.env.CODECOV_TOKEN
            })
        ]
    })
);
