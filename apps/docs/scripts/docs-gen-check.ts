#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');

/**
 * CI gate for docs content generation. Runs the full pipeline and reports any
 * failure. Phase H1 of the refactor plan extends this with a check that every
 * `{@link X}` reference in authored MDX resolves through the symbol index —
 * for now the gate is simply "does `pnpm gen` succeed".
 */
function run(cmd: string): void {
    console.info(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: DOCS_APP });
}

run('pnpm gen');
console.info('[gen:check] OK');
