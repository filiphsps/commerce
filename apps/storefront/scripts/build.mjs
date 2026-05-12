#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adapterPath = path.resolve(__dirname, '..', 'adapter.mjs');

const env = { ...process.env };

// Preserve whatever adapter the host environment (e.g. Vercel) injected so our
// wrapper can delegate to it after fixing missing fallback shells.
if (env.NEXT_ADAPTER_PATH && env.NEXT_ADAPTER_PATH !== adapterPath) {
    env.NEXT_ORIGINAL_ADAPTER_PATH = env.NEXT_ADAPTER_PATH;
}
env.NEXT_ADAPTER_PATH = adapterPath;

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'build', '--turbo'], {
    stdio: 'inherit',
    env,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 0);
});
