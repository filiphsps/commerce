import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// lib/page-map.generated.ts is gitignored — emit it before vitest collects.
if (!existsSync(path.join(__dirname, 'lib/page-map.generated.ts'))) {
    execSync('node scripts/generate-page-map.mjs', { cwd: __dirname, stdio: 'inherit' });
}

export default defineConfig({
    resolve: {
        alias: {
            '@': __dirname,
        },
    },
    test: {
        name: '@nordcom/commerce-docs',
        environment: 'happy-dom',
        include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'scripts/**/*.test.{mjs,ts}'],
    },
});
