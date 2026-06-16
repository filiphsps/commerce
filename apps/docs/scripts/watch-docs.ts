#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { main as emitReference } from './emit-reference-mdx';
import { discoverWorkspaces } from './lib/workspace-discovery.js';
import { main as mirrorDocs } from './mirror-workspace-docs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DOCS_APP = path.resolve(__dirname, '..');

const DEBOUNCE_MS = 250;

let timer: NodeJS.Timeout | undefined;
let running = false;
let queued = false;

/**
 * Mirror uses hardlinks, so edits to existing .md(x) source files are reflected in
 * `(generated)/` automatically — Next.js HMR picks them up without a re-mirror.
 *
 * The watcher only needs to fire on structural changes: new files, deletes, and
 * renames. We trigger on any change under a workspace's `docs/` directory and let
 * mirror's sweep-and-relink handle it.
 *
 * TypeDoc is deliberately NOT auto-rebuilt: a full pass takes ~20s and source-code
 * changes are far more frequent than API-surface changes. Run `pnpm gen` on
 * demand after API changes.
 */
/**
 * Decide whether a change event under a watched workspace `docs/` directory
 * should trigger a mirror+reference rebuild. We watch each workspace's `docs/`
 * dir directly (never the parent `apps/`/`packages/` trees — those pull in every
 * `node_modules`/`.next`/`.turbo`, and the resulting recursive-watch + event
 * firehose under dev-server churn is the memory leak this avoids), so the only
 * filter left is the file extension.
 *
 * @param filename - Relative filename from the fs.watch callback.
 * @returns True when the change should kick off a rebuild.
 */
function shouldRebuild(filename: string | null): boolean {
    if (!filename) return false;
    return filename.endsWith('.md') || filename.endsWith('.mdx');
}

async function rebuild(): Promise<void> {
    if (running) {
        queued = true;
        return;
    }
    running = true;
    const start = Date.now();
    try {
        mirrorDocs({ quiet: true });
        await emitReference({ quiet: true });
        console.info(`[watch] rebuilt mirror → reference (${Date.now() - start}ms)`);
    } catch (err) {
        console.error('[watch] rebuild failed:', err);
    }
    running = false;
    if (queued) {
        queued = false;
        timer = setTimeout(rebuild, 0);
    }
}

function schedule(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(rebuild, DEBOUNCE_MS);
}

function watchTree(dir: string): void {
    if (!fs.existsSync(dir)) return;
    try {
        fs.watch(dir, { recursive: true }, (_event, filename) => {
            if (shouldRebuild(filename)) schedule();
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[watch] cannot watch ${dir}: ${message}`);
    }
}

console.info('[watch] watching workspace docs/ for .md(x) changes (run `pnpm gen` after API changes)');
for (const ws of discoverWorkspaces(REPO_ROOT)) {
    // The docs app's own gen output lands in apps/docs/content, not its docs/ dir,
    // so it is never a mirror source — skip it to keep the watch set to true sources.
    if (ws.rootPath === DOCS_APP) continue;
    watchTree(ws.docsPath);
}
