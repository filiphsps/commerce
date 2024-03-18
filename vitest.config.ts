import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

import base from './vite.config';

const reporters = ['verbose'];
const extraReporters = !!process.env.GITHUB_ACTIONS ? ['github-actions'] : [];

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
    base,
    defineConfig({
        root: resolve(__dirname),
        optimizeDeps: {
            force: true
        },
        test: {
            bail: 2,
            disableConsoleIntercept: true,
            environment: 'node',
            exclude: ['**/*.{d.ts,json}', '**/*.stories.*', '**/dist/**/*.*', '**/node_modules/**/*.*'],
            maxConcurrency: 16,
            passWithNoTests: true,
            silent: false,
            reporters: [...reporters, ...extraReporters],

            pool: 'vmThreads',
            poolOptions: {
                vmThreads: {
                    useAtomics: true
                }
            },

            coverage: {
                all: true,
                exclude: ['**/*.d.ts', '**/dist/**/*.*', '**/coverage/**/*.*', '**/.next/**/*.*'],
                include: ['**/src/**/*.ts*'],
                provider: 'v8',
                reporter: ['text', 'json'],
                reportOnFailure: true
            },

            typecheck: {
                tsconfig: './tsconfig.test.json'
            }
        }
    })
);
