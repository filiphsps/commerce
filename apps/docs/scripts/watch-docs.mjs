import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { main as generatePageMap } from './generate-page-map.mjs';
import { main as mirrorDocs } from './mirror-workspace-docs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const DEBOUNCE_MS = 250;

let timer;
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
 * changes are far more frequent than API-surface changes. Run `pnpm pre:typedoc`
 * (or `pnpm pre`) on demand after API changes.
 */
function shouldRebuild(filename) {
    if (!filename) return false;
    if (filename.includes('node_modules')) return false;
    if (filename.includes('.next')) return false;
    if (filename.includes('.turbo')) return false;
    if (filename.includes('.typedoc-out')) return false;
    if (filename.includes('(generated)')) return false;
    if (filename.includes('page-map.generated')) return false;
    // Only re-mirror when a doc file under a workspace's docs/ directory changes.
    if (!filename.includes(`${path.sep}docs${path.sep}`)) return false;
    return filename.endsWith('.md') || filename.endsWith('.mdx');
}

async function rebuild() {
    if (running) {
        queued = true;
        return;
    }
    running = true;
    const start = Date.now();
    try {
        mirrorDocs({ quiet: true });
        generatePageMap({ quiet: true });
        console.info(`[watch] rebuilt mirror → page-map (${Date.now() - start}ms)`);
    } catch (err) {
        console.error('[watch] rebuild failed:', err);
    }
    running = false;
    if (queued) {
        queued = false;
        timer = setTimeout(rebuild, 0);
    }
}

function schedule() {
    clearTimeout(timer);
    timer = setTimeout(rebuild, DEBOUNCE_MS);
}

function watchTree(dir) {
    if (!fs.existsSync(dir)) return;
    try {
        fs.watch(dir, { recursive: true }, (_event, filename) => {
            if (shouldRebuild(filename)) schedule();
        });
    } catch (err) {
        console.warn(`[watch] cannot watch ${dir}: ${err.message}`);
    }
}

console.info('[watch] watching workspace docs/ for .md(x) changes (run `pnpm pre:typedoc` after API changes)');
watchTree(path.join(REPO_ROOT, 'apps'));
watchTree(path.join(REPO_ROOT, 'packages'));
