#!/usr/bin/env tsx
/**
 * Keep Claude Code plugins pinned to the workspace package versions they ship.
 *
 * A public plugin under `plugins/<name>/` runs a published package via `pnpm dlx
 * <pkg>@<version>`, so its pin — plus the plugin manifest's `version` and the
 * marketplace listing's plugin `version` — must track that package's
 * `package.json`, which `changeset version` bumps on release. Otherwise a stale
 * plugin gets published. The repo-local directory-source plugins under
 * `.claude/plugins/` instead run the workspace build, so they carry no `@version`
 * dlx pin; only their cosmetic `version` is synced for parity.
 *
 * Nothing here is plugin-specific. The workspace is the source of truth:
 *   1. Every `package.json` under `packages/`/`apps/` contributes a name → version.
 *   2. Any `<pkg>@<semver>` dlx pin in a scanned file, where `<pkg>` is a known
 *      workspace package, is rewritten to that package's version.
 *   3. A plugin's canonical version comes from the package its dlx pins
 *      reference (or, for dist-source plugins with no pin, a workspace package
 *      sharing the plugin's name). That version is written into every
 *      `plugin.json` and marketplace entry carrying the plugin's name.
 *
 * Adding a new plugin that pins a workspace package needs no edits here.
 *
 * Usage:
 *   tsx scripts/sync-plugin-version.ts            # rewrite files to match packages
 *   tsx scripts/sync-plugin-version.ts --check    # CI gate: fail on drift, no writes
 *
 * Exit codes:
 *   0 — in sync (or files rewritten)
 *   1 — `--check` found drift
 *   2 — misconfiguration (no workspace packages discovered)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Roots scanned for workspace `package.json` files (the version source of truth). */
const PACKAGE_ROOTS = ['packages', 'apps'];
/** Roots scanned for plugin/marketplace files that carry a synced version. */
const PLUGIN_ROOTS = ['plugins', '.claude-plugin', '.claude/plugins'];
/** Basenames whose contents may carry a version pin. */
const SYNCED_FILES = new Set(['.lsp.json', '.mcp.json', 'plugin.json', 'marketplace.json', 'README.md']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.turbo', 'coverage']);

const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[\w.]+)?`;
/** A `<pkg>@<semver>` dlx pin; the package name precedes the `@`. */
const DLX_PIN = new RegExp(String.raw`([@\w][\w@/.-]*)@(${SEMVER})`, 'g');

/**
 * Escape a string for literal use inside a `RegExp`.
 *
 * @param value - The raw string (e.g. a scoped package name).
 * @returns The regex-safe string.
 */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex matching the `version` field that sits in the SAME JSON object
 * as `"name": "<plugin>"`. The `[^}]` bound keeps the match inside that object,
 * so a sibling `owner`/`author` `name` never gets paired with a plugin version.
 *
 * @param plugin - Exact plugin name to anchor on.
 * @returns A global regex with the version digits as the substituted middle.
 */
function namedVersionPattern(plugin: string): RegExp {
    return new RegExp(String.raw`("name":\s*"${escapeRegExp(plugin)}"[^}]*?"version":\s*")${SEMVER}(")`, 'g');
}

/**
 * Recursively collect files under `dir` whose basename is in `match`.
 *
 * @param dir - Absolute directory to walk.
 * @param match - Predicate over a basename.
 * @returns Absolute paths of matching files (empty if `dir` is missing).
 */
function walk(dir: string, match: (name: string) => boolean): string[] {
    let entries: ReturnType<typeof readdirSync>;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return [];
    }

    const found: string[] = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            found.push(...walk(join(dir, entry.name), match));
        } else if (match(entry.name)) {
            found.push(join(dir, entry.name));
        }
    }
    return found;
}

/**
 * Build the workspace `name → version` map from every package manifest.
 *
 * @returns A map of package name to its declared version.
 */
function workspaceVersions(): Map<string, string> {
    const versions = new Map<string, string>();
    for (const root of PACKAGE_ROOTS) {
        for (const file of walk(join(ROOT, root), (name) => name === 'package.json')) {
            const pkg = JSON.parse(readFileSync(file, 'utf8')) as { name?: string; version?: string };
            if (pkg.name && pkg.version) versions.set(pkg.name, pkg.version);
        }
    }
    return versions;
}

/**
 * Map each public plugin's name to its canonical version — the workspace
 * version of the package its dlx pins reference, falling back to a workspace
 * package sharing the plugin's directory name.
 *
 * @param versions - Workspace `name → version` map.
 * @returns A map of plugin name to its canonical version.
 */
function pluginVersions(versions: Map<string, string>): Map<string, string> {
    const canonical = new Map<string, string>();
    const pluginsDir = join(ROOT, 'plugins');
    let dirs: ReturnType<typeof readdirSync>;
    try {
        dirs = readdirSync(pluginsDir, { withFileTypes: true });
    } catch {
        return canonical;
    }

    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const name = dir.name;

        let pkg: string | undefined;
        for (const file of walk(join(pluginsDir, name), (basename) => SYNCED_FILES.has(basename))) {
            for (const [, candidate] of readFileSync(file, 'utf8').matchAll(DLX_PIN)) {
                if (versions.has(candidate)) {
                    pkg = candidate;
                    break;
                }
            }
            if (pkg) break;
        }

        const version = (pkg && versions.get(pkg)) ?? versions.get(name);
        if (version) canonical.set(name, version);
    }
    return canonical;
}

/**
 * Rewrite every synced version token in `content`: dlx pins to their workspace
 * version, and named-entry `version` fields to the plugin's canonical version.
 *
 * @param content - Raw file text.
 * @param versions - Workspace `name → version` map.
 * @param canonical - Plugin `name → version` map.
 * @returns The rewritten text (unchanged where nothing is pinned).
 */
function rewrite(content: string, versions: Map<string, string>, canonical: Map<string, string>): string {
    let next = content.replace(DLX_PIN, (match, pkg) => {
        const target = versions.get(pkg);
        return target ? `${pkg}@${target}` : match;
    });
    for (const [plugin, version] of canonical) {
        next = next.replace(namedVersionPattern(plugin), `$1${version}$2`);
    }
    return next;
}

/**
 * Sync (or, with `--check`, verify) plugin version pins against workspace
 * package versions. Drift in `--check` mode lists each stale file and exits
 * non-zero.
 *
 * @returns Nothing; sets the process exit code on drift or misconfiguration.
 */
function main(): void {
    const check = process.argv.includes('--check');

    const versions = workspaceVersions();
    if (versions.size === 0) {
        console.error('✘ No workspace packages discovered');
        process.exitCode = 2;
        return;
    }
    const canonical = pluginVersions(versions);

    const files = new Set<string>();
    for (const root of PLUGIN_ROOTS) {
        for (const file of walk(join(ROOT, root), (name) => SYNCED_FILES.has(name))) files.add(file);
    }

    const drifted: string[] = [];
    for (const file of files) {
        const current = readFileSync(file, 'utf8');
        const next = rewrite(current, versions, canonical);
        if (next === current) continue;

        drifted.push(file.slice(ROOT.length + 1));
        if (!check) writeFileSync(file, next);
    }

    if (drifted.length === 0) {
        console.info('✓ plugins in sync with workspace package versions');
        return;
    }

    if (check) {
        console.error('✘ plugins out of sync with workspace package versions:');
        for (const file of drifted) console.error(`  - ${file}`);
        console.error('Run `pnpm plugins:sync` to fix.');
        process.exitCode = 1;
        return;
    }

    console.info('✓ synced plugins to workspace package versions:');
    for (const file of drifted) console.info(`  - ${file}`);
}

main();
