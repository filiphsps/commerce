// apps/docs/scripts/emit-typedoc-json.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Application, TSConfigReader } from 'typedoc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const OUT_ROOT = path.join(DOCS_APP, '.typedoc-out');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', '.next', 'coverage', 'docs', 'src', 'api']);

const WATCH = process.argv.includes('--watch');

async function main() {
    const workspaces = discoverPackagesWithExports(REPO_ROOT);
    let totalSubpaths = 0;
    let warnings = 0;

    fs.rmSync(OUT_ROOT, { recursive: true, force: true });
    fs.mkdirSync(OUT_ROOT, { recursive: true });

    for (const ws of workspaces) {
        const subpaths = resolveSubpaths(ws.rootPath);
        if (subpaths.length === 0) continue;

        const entryPoints = subpaths.map((s) => s.sourceFile);

        const app = await Application.bootstrapWithPlugins(
            {
                tsconfig: path.join(DOCS_APP, 'tsconfig.typedoc.json'),
                entryPoints,
                entryPointStrategy: 'expand',
                excludeExternals: true,
                excludePrivate: true,
                excludeInternal: true,
                skipErrorChecking: true,
                logLevel: 'Warn',
            },
            [new TSConfigReader()],
        );

        const project = await app.convert();
        if (!project) {
            warnings++;
            console.warn(`[typedoc] convert failed for ${ws.slug}`);
            continue;
        }

        const serialized = app.serializer.projectToObject(project, process.cwd());
        const flattened = flattenModules(serialized);
        const sourceBase = commonSourceBase(entryPoints);

        for (const sub of subpaths) {
            const outFile = subpathJsonPath(OUT_ROOT, ws.slug, sub.subpath);
            fs.mkdirSync(path.dirname(outFile), { recursive: true });
            const filtered = filterToSubpath(flattened, sub.sourceFile, sourceBase);
            fs.writeFileSync(outFile, JSON.stringify(filtered, null, 2));
            totalSubpaths++;
        }
    }

    console.info(`[emit-typedoc-json] emitted ${totalSubpaths} subpath JSON files; warnings: ${warnings}`);
}

function discoverPackagesWithExports(repoRoot) {
    const out = [];
    for (const parent of ['apps', 'packages']) {
        const root = path.join(repoRoot, parent);
        if (!fs.existsSync(root)) continue;
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
            walk(path.join(root, entry.name), parent, [entry.name], out);
        }
    }
    return out;
}

function walk(dir, parent, segments, out) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
        out.push({ slug: segments.join('/'), rootPath: dir, parent });
        return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(path.join(dir, entry.name), parent, [...segments, entry.name], out);
    }
}

function resolveSubpaths(workspaceRoot) {
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.exports) return [];
    const out = [];
    if (typeof pkg.exports === 'string') {
        const file = resolveTs(workspaceRoot, pkg.exports);
        if (file) out.push({ subpath: '.', sourceFile: file });
        return out;
    }
    for (const [key, value] of Object.entries(pkg.exports)) {
        const file = resolveAny(workspaceRoot, value);
        if (file) out.push({ subpath: key, sourceFile: file });
    }
    return out;
}

function resolveAny(root, value) {
    if (typeof value === 'string') return resolveTs(root, value);
    if (Array.isArray(value)) {
        for (const v of value) {
            const r = resolveAny(root, v);
            if (r) return r;
        }
        return undefined;
    }
    if (typeof value === 'object' && value !== null) {
        for (const cond of ['types', 'source', 'import', 'default', 'require']) {
            if (cond in value) {
                const r = resolveAny(root, value[cond]);
                if (r) return r;
            }
        }
    }
    return undefined;
}

function resolveTs(root, relPath) {
    if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) return undefined;
    const abs = path.resolve(root, relPath);
    return fs.existsSync(abs) ? abs : undefined;
}

function subpathJsonPath(outRoot, workspaceSlug, subpath) {
    const subFs = subpath === '.' ? 'index' : subpath.replace(/^\.\//, '');
    return path.join(outRoot, workspaceSlug, `${subFs}.json`);
}

/**
 * When TypeDoc is given multiple entry points (one per subpath), it wraps each entry in a Module
 * reflection (kind=2). The real symbols (functions, classes, types, variables) live in
 * `module.children`, not at the project root. Flatten one level so the subsequent filter sees a
 * uniform list of declarations regardless of single-vs-multi entry-point shape. Drops `groups`
 * because `typedoc-loader.groupSymbols` rebuilds them by kind anyway.
 */
function flattenModules(serialized) {
    const out = { ...serialized };
    out.children = [];
    delete out.groups;
    for (const child of serialized.children ?? []) {
        // TypeDoc ReflectionKind.Module === 2.
        if (child.kind === 2 && Array.isArray(child.children)) {
            out.children.push(...child.children);
        } else {
            out.children.push(child);
        }
    }
    return out;
}

/**
 * Longest common ancestor directory of the given absolute paths. Used to resolve TypeDoc's
 * relative `sources[0].fileName` back to an absolute path so the subpath filter can compare
 * accurately even when the cwd doesn't match TypeDoc's rebase reference.
 */
function commonSourceBase(absPaths) {
    if (absPaths.length === 0) return process.cwd();
    let parts = absPaths[0].split(path.sep);
    for (const p of absPaths.slice(1)) {
        const other = p.split(path.sep);
        const limit = Math.min(parts.length, other.length);
        let i = 0;
        while (i < limit && parts[i] === other[i]) i++;
        parts = parts.slice(0, i);
    }
    // Trim trailing filename component if present (entries are files, not directories).
    const candidate = parts.join(path.sep);
    return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory() ? candidate : path.dirname(candidate);
}

/**
 * Reduce the project to only declarations whose source is inside this subpath's entry tree.
 *
 * Subpaths come in two flavors:
 * - "directory" subpaths backed by `<dir>/index.ts` — match symbols anywhere under `<dir>/`.
 * - "single-file" subpaths backed by a bare `<name>.ts` — match only that file. Otherwise a
 *   subpath like `./cache` (sourceFile `src/cache.ts`) would absorb every symbol in the package
 *   because its dirname is the package's src root.
 */
function filterToSubpath(project, sourceFile, sourceBase) {
    const isIndexEntry = path.basename(sourceFile) === 'index.ts' || path.basename(sourceFile) === 'index.tsx';
    const dir = path.dirname(sourceFile);
    function isInSubpath(d) {
        const src = d?.sources?.[0]?.fileName;
        if (!src) return false;
        const abs = path.isAbsolute(src) ? src : path.resolve(sourceBase, src);
        if (abs === sourceFile) return true;
        return isIndexEntry && abs.startsWith(dir + path.sep);
    }
    const children = (project.children ?? []).filter(isInSubpath);
    return {
        name: project.name,
        kind: project.kind,
        flags: project.flags,
        children,
        sources: project.sources,
    };
}

if (WATCH) {
    // Simple watch: rebuild on any change under packages/**/src; debounced 500ms.
    let timer;
    fs.watch(path.join(REPO_ROOT, 'packages'), { recursive: true }, (_event, filename) => {
        if (!filename?.endsWith('.ts')) return;
        clearTimeout(timer);
        timer = setTimeout(() => main().catch(console.error), 500);
    });
    main().catch(console.error);
} else {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
