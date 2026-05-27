#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { main as emitReference } from './emit-reference-mdx';
import { main as mirrorDocs } from './mirror-workspace-docs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

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
 * Decide whether a change event under `root` (the `apps/` or `packages/`
 * directory we're watching) should trigger a mirror+reference rebuild.
 * `filename` here is RELATIVE to `root`, so we resolve it to an absolute
 * path before applying the exclusion list — otherwise the
 * `${sep}apps${sep}docs${sep}` guard never matches when the watch root is
 * already `apps/` and emitting `docs/content/.../foo.mdx` into our own tree
 * pulls the watcher into an infinite loop.
 *
 * @param root - Absolute path of the watched root.
 * @param filename - Relative filename from the fs.watch callback.
 * @returns True when the change should kick off a rebuild.
 */
function shouldRebuild(root: string, filename: string | null): boolean {
    if (!filename) return false;
    const abs = path.join(root, filename);
    if (abs.includes('node_modules')) return false;
    if (abs.includes('.next')) return false;
    if (abs.includes('.turbo')) return false;
    if (abs.includes('.typedoc-out')) return false;
    // Our own docs app is the destination of every gen step. Listening to it
    // creates a write-loop: gen emits .mdx → watcher fires → gen emits again.
    if (abs.includes(`${path.sep}apps${path.sep}docs${path.sep}`)) return false;
    if (!abs.includes(`${path.sep}docs${path.sep}`)) return false;
    return abs.endsWith('.md') || abs.endsWith('.mdx');
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
            if (shouldRebuild(dir, filename)) schedule();
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[watch] cannot watch ${dir}: ${message}`);
    }
}

console.info('[watch] watching workspace docs/ for .md(x) changes (run `pnpm gen` after API changes)');
watchTree(path.join(REPO_ROOT, 'apps'));
watchTree(path.join(REPO_ROOT, 'packages'));
