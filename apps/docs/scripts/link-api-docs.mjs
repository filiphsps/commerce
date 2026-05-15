// @ts-check
/**
 * Mirrors TypeDoc-emitted API docs into each workspace's `docs/api` folder
 * so a single Docusaurus plugin per workspace can autogenerate a combined
 * sidebar of handwritten docs + API reference.
 *
 * Uses **hardlinks** rather than symlinks: Docusaurus' MDX-loader rule for
 * plugin-content-docs matches by path, and webpack resolves symlinks to their
 * realpath before matching — that bypasses the loader and causes SSG to fail
 * with "Cannot read properties of undefined (reading 'id')" at DocItem.
 * Hardlinks share the inode (so typedoc:watch rewrites still propagate) but
 * webpack sees them as ordinary files under the workspace's docs/ path.
 *
 * Run from `apps/docs/` after `pnpm typedoc`:
 *   node scripts/link-api-docs.mjs
 *
 * Idempotent. Sweeps existing api/ entries under apps/* and packages/* first.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const TYPEDOC_OUT = path.join(DOCS_APP, 'api');

/** Workspace dirs to scan/host links. */
const WORKSPACE_PARENTS = ['apps', 'packages'];

function removeApiDir() {
    for (const parent of WORKSPACE_PARENTS) {
        const root = path.join(REPO_ROOT, parent);
        if (!fs.existsSync(root)) continue;
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const candidate = path.join(root, entry.name, 'docs', 'api');
            const stat = fs.lstatSync(candidate, { throwIfNoEntry: false });
            if (!stat) continue;
            if (stat.isSymbolicLink()) {
                fs.unlinkSync(candidate);
            } else if (stat.isDirectory()) {
                fs.rmSync(candidate, { recursive: true, force: true });
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

/** @param {string} src @param {string} dest */
function hardlinkDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            hardlinkDir(s, d);
        } else if (entry.isFile()) {
            fs.linkSync(s, d);
        }
    }
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
    hardlinkDir(typedocSrc, linkTarget);
    return { name, linkTarget };
}

/**
 * TypeDoc emits cross-package references as `[Text](../../../<pkg>/src/...md)`.
 * Each workspace is its own Docusaurus plugin, so neither the original path
 * (the `src/` segment doesn't exist in the workspace mirror) nor any rewritten
 * relative path resolves cleanly across plugin boundaries. The pragmatic fix:
 * strip the link to preserve the text but drop the broken hyperlink. The
 * reader still sees `EntitiesMap` (often a code span) where the link used to
 * be — they just don't get a navigation target.
 *
 * Hardlinks share the inode, so writing one copy updates them all.
 *
 * @param {string[]} workspaceNames packages we just linked, used to scope the rewrite
 * @param {string[]} mirroredApiDirs target dirs we just hardlinked into
 */
function rewriteCrossPackageLinks(workspaceNames, mirroredApiDirs) {
    if (workspaceNames.length === 0) return 0;

    // Match `[text](<dots><pkg>/src/<rest>)` where <pkg> is one of the workspaces
    // we linked. Capture only the visible text so we can keep it intact.
    const pkgAlternation = workspaceNames.map(escapeRegex).join('|');
    const pattern = new RegExp(`\\[([^\\]]+)\\]\\((?:\\.\\./)+(?:${pkgAlternation})/src/[^)]+\\)`, 'g');

    let rewritten = 0;
    for (const apiDir of mirroredApiDirs) {
        for (const file of walkMarkdown(apiDir)) {
            const before = fs.readFileSync(file, 'utf8');
            const after = before.replace(pattern, (_match, text) => text);
            if (after !== before) {
                fs.writeFileSync(file, after);
                rewritten++;
            }
        }
    }
    return rewritten;
}

/** @param {string} s */
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} dir @returns {Generator<string>} */
function* walkMarkdown(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walkMarkdown(full);
        else if (entry.isFile() && entry.name.endsWith('.md')) yield full;
    }
}

function main() {
    if (!fs.existsSync(TYPEDOC_OUT)) {
        console.warn(`[link-api-docs] no typedoc output at ${TYPEDOC_OUT} — run \`pnpm typedoc\` first`);
        return;
    }

    removeApiDir();

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

    for (const { name } of linked) {
        console.info(`[link-api-docs] hardlinked ${name}/docs/api`);
    }

    const rewritten = rewriteCrossPackageLinks(
        linked.map((l) => l.name),
        linked.map((l) => l.linkTarget),
    );
    if (rewritten > 0) {
        console.info(`[link-api-docs] rewrote cross-package src/ links in ${rewritten} file(s)`);
    }

    console.info(`[link-api-docs] linked ${linked.length} workspace(s)`);
}

main();
