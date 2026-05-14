// @ts-check
/**
 * Symlinks TypeDoc-emitted API docs into each workspace's `docs/api` folder
 * so a single Docusaurus plugin per workspace can autogenerate a combined
 * sidebar of handwritten docs + API reference.
 *
 * Run from `apps/docs/` after `pnpm typedoc`:
 *   node scripts/link-api-docs.mjs
 *
 * Idempotent. Only touches symlinks — refuses to overwrite real
 * directories at the target path.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const TYPEDOC_OUT = path.join(DOCS_APP, 'api');

/** Workspace dirs to scan when sweeping stale symlinks. */
const WORKSPACE_PARENTS = ['apps', 'packages'];

function removeStaleSymlinks() {
    for (const parent of WORKSPACE_PARENTS) {
        const root = path.join(REPO_ROOT, parent);
        if (!fs.existsSync(root)) continue;
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const candidate = path.join(root, entry.name, 'docs', 'api');
            const stat = fs.lstatSync(candidate, { throwIfNoEntry: false });
            if (stat?.isSymbolicLink()) {
                fs.unlinkSync(candidate);
            }
        }
    }
}

/** @param {string} name */
function findWorkspaceRoot(name) {
    for (const parent of WORKSPACE_PARENTS) {
        const candidate = path.join(REPO_ROOT, parent, name);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            return candidate;
        }
    }
    return null;
}

/** @param {string} name */
function linkWorkspace(name) {
    const typedocSrc = path.join(TYPEDOC_OUT, name, 'src');
    if (!fs.existsSync(typedocSrc)) return null;

    const workspaceRoot = findWorkspaceRoot(name);
    if (!workspaceRoot) {
        console.warn(`[link-api-docs] no workspace for "${name}" — skipping`);
        return null;
    }

    const docsDir = path.join(workspaceRoot, 'docs');
    if (!fs.existsSync(docsDir)) {
        console.warn(`[link-api-docs] "${name}" has no docs/ — skipping`);
        return null;
    }

    const linkTarget = path.join(docsDir, 'api');
    const existing = fs.lstatSync(linkTarget, { throwIfNoEntry: false });
    if (existing && !existing.isSymbolicLink()) {
        throw new Error(`[link-api-docs] refusing to overwrite non-symlink at ${linkTarget}`);
    }
    if (existing) fs.unlinkSync(linkTarget);

    const relativeTarget = path.relative(docsDir, typedocSrc);
    fs.symlinkSync(relativeTarget, linkTarget, 'dir');
    return { name, relativeTarget };
}

function main() {
    if (!fs.existsSync(TYPEDOC_OUT)) {
        console.warn(`[link-api-docs] no typedoc output at ${TYPEDOC_OUT} — run \`pnpm typedoc\` first`);
        return;
    }

    removeStaleSymlinks();

    const names = fs
        .readdirSync(TYPEDOC_OUT, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    const linked = [];
    for (const name of names) {
        const result = linkWorkspace(name);
        if (result) linked.push(result);
    }

    for (const { name, relativeTarget } of linked) {
        console.log(`[link-api-docs] ${name}/docs/api -> ${relativeTarget}`);
    }
    console.log(`[link-api-docs] linked ${linked.length} workspace(s)`);
}

main();
