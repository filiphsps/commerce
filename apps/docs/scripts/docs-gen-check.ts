#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');

/**
 * CI gate for docs content generation. Runs the full generation pipeline then
 * validates every `{@link X}` reference in authored MDX against the symbol
 * index produced by Phase G. Any unresolved reference causes a non-zero exit.
 *
 * Token lookup strips a leading path prefix (e.g. `errors/API_UNKNOWN_LOCALE`
 * → `API_UNKNOWN_LOCALE`) so authors can use explicit paths for readability
 * without needing the index to store fully-qualified keys.
 */

/**
 * Execute a shell command, inheriting stdio, inside `DOCS_APP`.
 *
 * @param cmd - Command string to run.
 */
function run(cmd: string): void {
    console.info(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: DOCS_APP });
}

/**
 * Recursively yield every file path under a directory.
 *
 * @param dir - Absolute directory path.
 * @returns Generator of absolute file paths.
 */
function* walkDir(dir: string): Generator<string> {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walkDir(full);
        else if (entry.isFile()) yield full;
    }
}

run('pnpm gen');

const indexPath = path.join(DOCS_APP, 'lib/symbol-index.generated.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as Record<string, unknown>;

const linkRegex = /\{@link\s+([^}\s]+)/g;
const unresolved: string[] = [];

for (const mdxFile of walkDir(path.join(DOCS_APP, 'content'))) {
    if (!mdxFile.endsWith('.mdx')) continue;
    const body = fs.readFileSync(mdxFile, 'utf8');
    for (const m of body.matchAll(linkRegex)) {
        const raw = m[1]!;
        // Strip a leading path prefix so `errors/API_UNKNOWN_LOCALE` resolves
        // the same as the bare key `API_UNKNOWN_LOCALE` that the index stores.
        const token = raw.includes('/') ? raw.split('/').at(-1)! : raw;
        if (!(token in index)) {
            unresolved.push(`${mdxFile}: {@link ${raw}}`);
        }
    }
}

if (unresolved.length > 0) {
    console.error('[gen:check] unresolved {@link} references:');
    for (const u of unresolved) console.error(`  ${u}`);
    process.exit(1);
}

console.info('[gen:check] OK');
